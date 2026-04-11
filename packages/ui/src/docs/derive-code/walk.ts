import { Children, type ReactElement, type ReactNode } from 'react'
import { formatLiteral, formatProps, INDENT, renderOpenTag } from './format'
import {
	flattenPassThroughs,
	hasTextContent,
	isMeaningfulElement,
	isPrimitive,
	pluralize,
	propsEqual,
	uniqueConstName,
} from './helpers'
import type { Ctx } from './types'

// ---------------------------------------------------------------------------
// Tree traversal
// ---------------------------------------------------------------------------

/**
 * Render a list of React children as a JSX snippet. The heart of the
 * derivation: flattens noise, detects iteration patterns, and falls back to a
 * deduplicated sibling render when no higher-level pattern matches.
 */
export function renderNodes(nodes: ReactNode[], ctx: Ctx, indent: string): string {
	// Flattening at every level lets list detection see the real components
	// that were wrapped in styling divs/spans.
	const elements = flattenPassThroughs(nodes.filter(isMeaningfulElement))

	if (elements.length === 0) return ''

	if (elements.length === 1) {
		return indent + renderElement(elements[0], ctx, indent)
	}

	const list = tryRenderAsList(elements, ctx, indent)

	if (list !== null) return list

	// Render each sibling, deduplicating identical outputs so N structurally
	// identical rows (e.g. TableRow iterated over an array) collapse to a
	// single representative.
	const seen = new Set<string>()

	const unique: string[] = []

	for (const el of elements) {
		const body = renderElement(el, ctx, indent)

		if (!body) continue

		const line = indent + body

		if (seen.has(line)) continue

		seen.add(line)

		unique.push(line)
	}

	return unique.join('\n')
}

/**
 * Render a single recognized component element. Unknown components are
 * transparently unwrapped so their internal composition can still contribute.
 */
export function renderElement(element: ReactElement, ctx: Ctx, indent: string): string {
	const info = ctx.map.get(element.type) ?? null

	if (!info) {
		// Unknown component (e.g. a locally-defined demo wrapper). Walk its
		// children for whatever recognizable components they contain.
		return renderNodes(
			Children.toArray((element.props as { children?: ReactNode }).children),
			ctx,
			indent,
		).trimStart()
	}

	if (info.module) {
		const set = ctx.imports.get(info.module) ?? new Set<string>()

		set.add(info.name)

		ctx.imports.set(info.module, set)
	}

	const props = element.props as Record<string, unknown>

	const propParts = formatProps(props, ctx)

	const childNodes = Children.toArray(props.children as ReactNode)

	const childrenStr = renderChildrenContent(childNodes, ctx, indent + INDENT)

	const open = renderOpenTag(info.name, propParts, indent, childrenStr !== '')

	if (childrenStr === '') return open

	if (childrenStr === '…') return `${open}…</${info.name}>`

	return `${open}\n${childrenStr}\n${indent}</${info.name}>`
}

/**
 * Render the children of a recognized component. Combines text detection
 * with recursive walking so mixed bodies (e.g. `<Icon />` plus a label)
 * show both the nested component and a `…` placeholder for the text.
 */
export function renderChildrenContent(nodes: ReactNode[], ctx: Ctx, indent: string): string {
	if (nodes.length === 0) return ''

	const rendered = renderNodes(nodes, ctx, indent)

	const hasText = hasTextContent(nodes)

	if (rendered === '') {
		return hasText ? '…' : ''
	}

	if (hasText) {
		return `${rendered}\n${indent}…`
	}

	return rendered
}

// ---------------------------------------------------------------------------
// List detection
// ---------------------------------------------------------------------------

/**
 * Detect an iteration pattern in a sibling list: all elements share a type and
 * exactly one prop varies. When matched, emits a `const plural = [...]`
 * declaration and returns a single representative element using the current
 * state's first value. The rendered literal still reflects the live prop, so
 * dynamic demos (listbox toggles, etc.) stay accurate.
 */
function tryRenderAsList(elements: ReactElement[], ctx: Ctx, indent: string): string | null {
	if (elements.length < 2) return null

	const firstType = elements[0].type

	if (!elements.every((el) => el.type === firstType)) return null

	const info = ctx.map.get(firstType) ?? null

	if (!info) return null

	const ignored = new Set(['children', 'className', 'key', 'ref'])

	const allKeys = new Set<string>()

	for (const el of elements) {
		for (const key of Object.keys(el.props as Record<string, unknown>)) {
			if (!ignored.has(key)) allKeys.add(key)
		}
	}

	const varying: string[] = []

	for (const key of allKeys) {
		const first = (elements[0].props as Record<string, unknown>)[key]

		const differs = elements.some(
			(el) => !propsEqual(first, (el.props as Record<string, unknown>)[key]),
		)

		if (differs) varying.push(key)
	}

	// Require exactly one prop to vary across the list — and require its values
	// to be primitives so the emitted `const` declaration actually reads well.
	if (varying.length !== 1) return null

	const prop = varying[0]

	const values = elements.map((el) => (el.props as Record<string, unknown>)[prop])

	if (!values.every(isPrimitive)) return null

	const constName = uniqueConstName(ctx, pluralize(prop))

	ctx.consts.push({
		name: constName,
		values: values.map((v) => formatLiteral(v as string | number | boolean)),
	})

	return indent + renderElement(elements[0], ctx, indent)
}
