import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react'
import type { Ctx } from './types'

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isMeaningfulElement(node: ReactNode): node is ReactElement {
	return isValidElement(node)
}

/**
 * Fragment and intrinsic HTML elements are transparent — they're used for
 * styling or grouping in the demo but aren't part of the API surface we want
 * to document.
 */
export function isPassThrough(element: ReactElement): boolean {
	if (element.type === Fragment) return true

	if (typeof element.type === 'string') return true

	return false
}

export function isPrimitive(value: unknown): value is string | number | boolean {
	return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

// ---------------------------------------------------------------------------
// Tree inspection
// ---------------------------------------------------------------------------

/**
 * Flatten Fragments and HTML wrappers, keeping only meaningful component
 * elements. Works recursively so `<div><span><Button/></span></div>` surfaces
 * the Button at the top level.
 */
export function flattenPassThroughs(elements: ReactElement[]): ReactElement[] {
	const result: ReactElement[] = []

	for (const el of elements) {
		if (isPassThrough(el)) {
			const children = Children.toArray((el.props as { children?: ReactNode }).children).filter(
				isMeaningfulElement,
			)

			result.push(...flattenPassThroughs(children))

			continue
		}

		result.push(el)
	}

	return result
}

/**
 * Detects whether a subtree contains any text/number leaf — including text
 * buried inside pass-through wrappers. Used to decide whether a component
 * should render `<Foo>…</Foo>` or `<Foo />`.
 */
export function hasTextContent(nodes: ReactNode[]): boolean {
	for (const n of nodes) {
		if (typeof n === 'string' && n.trim() !== '') return true

		if (typeof n === 'number') return true

		if (isValidElement(n) && isPassThrough(n)) {
			const children = Children.toArray((n.props as { children?: ReactNode }).children)

			if (hasTextContent(children)) return true
		}
	}

	return false
}

/**
 * Collect the text/number leaves from a subtree into a single string,
 * walking through pass-through wrappers. Returns the concatenated text
 * or `null` if no text is found.
 */
export function extractTextContent(nodes: ReactNode[]): string | null {
	const parts: string[] = []

	for (const n of nodes) {
		if (typeof n === 'string' && n.trim() !== '') {
			parts.push(n.trim())
		} else if (typeof n === 'number') {
			parts.push(String(n))
		} else if (isValidElement(n) && isPassThrough(n)) {
			const children = Children.toArray((n.props as { children?: ReactNode }).children)
			const nested = extractTextContent(children)

			if (nested) parts.push(nested)
		}
	}

	return parts.length > 0 ? parts.join(' ') : null
}

// ---------------------------------------------------------------------------
// Naming
// ---------------------------------------------------------------------------

export function getElementName(element: ReactElement, ctx: Ctx): string | null {
	const info = ctx.map.get(element.type)

	if (info) return info.name

	const type = element.type as
		| string
		| { displayName?: string; name?: string; render?: { displayName?: string; name?: string } }

	if (typeof type === 'string') return type

	if (typeof type === 'function')
		return (
			(type as { displayName?: string; name?: string }).displayName ??
			(type as { name?: string }).name ??
			null
		)

	if (typeof type === 'object' && type !== null) {
		if (type.displayName) return type.displayName

		if (type.render) return type.render.displayName ?? type.render.name ?? null
	}

	return null
}

export function pluralize(word: string): string {
	if (word.endsWith('s')) return word

	if (word.endsWith('y')) return `${word.slice(0, -1)}ies`

	return `${word}s`
}

export function uniqueConstName(ctx: Ctx, base: string): string {
	if (!ctx.constNames.has(base)) {
		ctx.constNames.add(base)

		return base
	}

	let i = 2

	while (ctx.constNames.has(`${base}${i}`)) i++

	const name = `${base}${i}`

	ctx.constNames.add(name)

	return name
}

// ---------------------------------------------------------------------------
// Structural equality
// ---------------------------------------------------------------------------

/**
 * Compare two prop values for "sameness" across a list of siblings. Handles
 * primitives, arrays, and nested React elements — the last is important
 * because a prop like `icon={<Plus />}` produces a fresh element per render,
 * so identity comparison would incorrectly mark them as varying.
 */
export function propsEqual(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true

	if (isValidElement(a) && isValidElement(b)) {
		if (a.type !== b.type) return false

		const aProps = a.props as Record<string, unknown>
		const bProps = b.props as Record<string, unknown>

		const aKeys = Object.keys(aProps).filter((k) => k !== 'key' && k !== 'ref')
		const bKeys = Object.keys(bProps).filter((k) => k !== 'key' && k !== 'ref')

		if (aKeys.length !== bKeys.length) return false

		for (const k of aKeys) {
			if (!propsEqual(aProps[k], bProps[k])) return false
		}

		return true
	}

	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false

		for (let i = 0; i < a.length; i++) {
			if (!propsEqual(a[i], b[i])) return false
		}

		return true
	}

	return false
}
