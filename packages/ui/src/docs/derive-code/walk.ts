import type { ReactElement, ReactNode } from 'react'
import { formatProps, INDENT, renderOpenTag } from './format'
import { addImport } from './imports'
import { collectSnippetImports, readSnippet, reindent } from './snippet'
import { collectChildItems, elementChildren } from './tree'
import type { Context } from './types'

// ---------------------------------------------------------------------------
// Tree traversal
// ---------------------------------------------------------------------------

/**
 * Render a list of React children as a JSX snippet. Pass-through wrappers
 * are flattened, text leaves keep their position relative to surrounding
 * elements, and consecutive iterated siblings collapse to a single
 * representative when the run is 3+ identical renders.
 *
 * Authored siblings (e.g. three buttons inside a `<Group>` to demonstrate
 * border joining) are kept intact — their multiplicity is the demo.
 */
export function renderNodes(nodes: ReactNode[], context: Context, indent: string): string {
	const items = collectChildItems(nodes)

	if (items.length === 0) return ''

	const parts: string[] = []

	let batch: ReactElement[] = []

	const flushBatch = () => {
		if (batch.length === 0) return

		parts.push(...renderElementBatch(batch, context, indent))

		batch = []
	}

	for (const item of items) {
		if (item.kind === 'text') {
			flushBatch()

			parts.push(indent + item.value)
		} else {
			batch.push(item.value)
		}
	}

	flushBatch()

	return parts.join('\n')
}

/**
 * Render a run of consecutive elements. Iteration-collapse (3+ identical
 * renders → one) only applies to keyed batches, so authored siblings without
 * keys pass through untouched.
 */
function renderElementBatch(elements: ReactElement[], context: Context, indent: string): string[] {
	if (elements.length === 1) {
		const only = elements[0]

		if (!only) return []

		const body = renderElement(only, context, indent)

		return body ? [indent + body] : []
	}

	const lines: string[] = []

	const counts = new Map<string, number>()

	for (const el of elements) {
		const body = renderElement(el, context, indent)

		if (!body) continue

		const line = indent + body

		counts.set(line, (counts.get(line) ?? 0) + 1)

		lines.push(line)
	}

	const isIteration = elements.length >= 2 && elements.every(hasExplicitKey)

	if (!isIteration) return lines

	const emitted = new Map<string, number>()

	const result: string[] = []

	for (const line of lines) {
		const total = counts.get(line) ?? 1

		const seen = emitted.get(line) ?? 0

		if (total >= 3 && seen >= 1) continue

		emitted.set(line, seen + 1)

		result.push(line)
	}

	return result
}

function hasExplicitKey(element: ReactElement): element is ReactElement & { key: string } {
	// `Children.toArray` serializes user-provided keys with a `.$` prefix
	// (positional siblings get `.0`, `.1`, …; nested arrays concatenate as
	// `.0/.$x`). We test for the `.$` marker, not a bare `$`, so authored
	// keys containing `$` in a non-iteration position don't false-positive.
	return typeof element.key === 'string' && element.key.includes('.$')
}

/**
 * Render a single recognized component element. Unknown components are
 * transparently unwrapped so their internal composition can still contribute.
 */
function renderElement(element: ReactElement, context: Context, indent: string): string {
	const info = context.registry.byType.get(element.type)

	if (!info) {
		// Unknown component (e.g. a locally-defined demo wrapper). Walk its
		// children for whatever recognizable components they contain.
		const children = elementChildren(element)

		if (children.length > 0) {
			return renderNodes(children, context, indent).trimStart()
		}

		// Self-closing helper with a build-time snippet attached by the
		// derive-code Vite plugin. Use the raw JSX verbatim so users see
		// the actual composition rather than an opaque `<HelperDemo />`.
		const snippet = readSnippet(element.type)

		if (snippet !== null) {
			collectSnippetImports(snippet, context)

			return reindent(snippet, indent)
		}

		return ''
	}

	if (info.module) addImport(context, info.module, info.name)

	const propParts = formatProps(element.props as Record<string, unknown>, context)

	const childrenStr = renderChildrenContent(elementChildren(element), context, indent + INDENT)

	const open = renderOpenTag(info.name, propParts, indent, childrenStr !== '')

	if (childrenStr === '') return open

	// Inline short text children (e.g. <Card>Left</Card>) rather than
	// breaking them across multiple lines. `childrenStr` always carries its
	// indent prefix; strip it here since the value sits between tags on a
	// single line.
	if (!childrenStr.includes('\n') && !childrenStr.includes('<')) {
		return `${open}${childrenStr.trimStart()}</${info.name}>`
	}

	return `${open}\n${childrenStr}\n${indent}</${info.name}>`
}

/**
 * Render the children of a recognized component. Defers to `renderNodes`
 * for the actual walk, then substitutes a `…` placeholder when children
 * exist but nothing was renderable — so the parent shows as `<Foo>…</Foo>`
 * instead of misleadingly collapsing to `<Foo />`.
 */
function renderChildrenContent(nodes: ReactNode[], context: Context, indent: string): string {
	if (nodes.length === 0) return ''

	const rendered = renderNodes(nodes, context, indent)

	return rendered !== '' ? rendered : '…'
}
