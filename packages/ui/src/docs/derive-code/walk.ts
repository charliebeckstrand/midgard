import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { formatProps, INDENT, renderOpenTag } from './format'
import { addImport } from './imports'
import { collectSnippetImports, readSnippet, reindent } from './snippet'
import { elementChildren, extractTextContent, flattenPassThroughs } from './tree'
import type { Ctx } from './types'

// ---------------------------------------------------------------------------
// Tree traversal
// ---------------------------------------------------------------------------

/**
 * Render a list of React children as a JSX snippet. Flattens pass-through
 * wrappers, then — when the siblings look like the output of a `.map()` —
 * collapses runs of 3+ identical renders so iterated content doesn't dominate.
 * Authored siblings (e.g. three buttons inside a `<Group>` to demonstrate
 * border joining) are kept intact, since their multiplicity is the demo.
 */
export function renderNodes(nodes: ReactNode[], ctx: Ctx, indent: string): string {
	// Flattening at every level lets list detection see the real components
	// that were wrapped in styling divs/spans.
	const elements = flattenPassThroughs(nodes.filter(isValidElement))

	if (elements.length === 0) return ''

	if (elements.length === 1 && elements[0]) {
		return indent + renderElement(elements[0], ctx, indent)
	}

	const lines: string[] = []

	const counts = new Map<string, number>()

	for (const el of elements) {
		const body = renderElement(el, ctx, indent)

		if (!body) continue

		const line = indent + body

		counts.set(line, (counts.get(line) ?? 0) + 1)

		lines.push(line)
	}

	// Only collapse duplicates when the siblings clearly came from iteration.
	// `Children.toArray` formats user-supplied keys as `.$<key>` and assigns
	// positional keys (`.0`, `.1`) to inline siblings, so an explicit key on
	// every sibling is the cleanest signal that this is `.map()` output.
	const isIteration = elements.length >= 2 && elements.every(hasExplicitKey)

	if (!isIteration) return lines.join('\n')

	const emitted = new Map<string, number>()

	const result: string[] = []

	for (const line of lines) {
		const total = counts.get(line) ?? 1

		const seen = emitted.get(line) ?? 0

		if (total >= 3 && seen >= 1) continue

		emitted.set(line, seen + 1)

		result.push(line)
	}

	return result.join('\n')
}

function hasExplicitKey(element: ReactElement): boolean {
	return typeof element.key === 'string' && element.key.includes('$')
}

/**
 * Render a single recognized component element. Unknown components are
 * transparently unwrapped so their internal composition can still contribute.
 */
export function renderElement(element: ReactElement, ctx: Ctx, indent: string): string {
	const info = ctx.registry.byType.get(element.type)

	if (!info) {
		// Unknown component (e.g. a locally-defined demo wrapper). Walk its
		// children for whatever recognizable components they contain.
		const children = elementChildren(element)

		if (children.length > 0) {
			return renderNodes(children, ctx, indent).trimStart()
		}

		// Self-closing helper with a build-time snippet attached by the
		// derived-code Vite plugin. Use the raw JSX verbatim so users see
		// the actual composition rather than an opaque `<HelperDemo />`.
		const snippet = readSnippet(element.type)

		if (snippet !== null) {
			collectSnippetImports(snippet, ctx)

			return reindent(snippet, indent)
		}

		return ''
	}

	if (info.module) addImport(ctx, info.module, info.name)

	const propParts = formatProps(element.props as Record<string, unknown>, ctx)

	const childrenStr = renderChildrenContent(elementChildren(element), ctx, indent + INDENT)

	const open = renderOpenTag(info.name, propParts, indent, childrenStr !== '')

	if (childrenStr === '') return open

	// Inline short text children (e.g. <Card>Left</Card>) rather than
	// breaking them across multiple lines.
	if (!childrenStr.includes('\n') && !childrenStr.includes('<')) {
		return `${open}${childrenStr}</${info.name}>`
	}

	return `${open}\n${childrenStr}\n${indent}</${info.name}>`
}

/**
 * Render the children of a recognized component. Combines text extraction
 * with recursive walking so mixed bodies (e.g. `<Icon />` plus a label)
 * show both the nested component and the text content.
 */
export function renderChildrenContent(nodes: ReactNode[], ctx: Ctx, indent: string): string {
	if (nodes.length === 0) return ''

	const rendered = renderNodes(nodes, ctx, indent).trimEnd()

	const text = extractTextContent(nodes)

	if (rendered === '') {
		// Children exist but nothing was recognized — show a placeholder so
		// the parent renders as `<Foo>…</Foo>` instead of `<Foo />`.
		return text ?? '…'
	}

	if (text) {
		return `${rendered}\n${indent}${text}`
	}

	return rendered
}
