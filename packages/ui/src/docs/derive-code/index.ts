'use client'

import { Children, type ReactElement, type ReactNode } from 'react'
import {
	addImport,
	assemble,
	collectChildItems,
	collectSnippetImports,
	elementChildren,
	formatProps,
	INDENT,
	PLACEHOLDER,
	readSnippet,
	reindent,
	renderOpenTag,
	resolveType,
} from './internals'
import { defaultRegistry } from './registry'
import type { Context } from './types'

/**
 * Walk a React children tree and produce a simplified code block showing how
 * to use the components on display.
 *
 * - Styling wrappers (divs, spans, Fragments) flatten away.
 * - Pure text/number children collapse to `...`.
 * - Runs of 3+ identical sibling renders collapse to a single representative.
 * - Imports come from build-time component tags; external components (e.g.
 *   lucide icons) resolve by `displayName` against the demos' package imports.
 *
 * Returns `null` when the subtree contains no recognized components; the
 * caller then provides an explicit `code` override or omits the code block.
 */
export function deriveCode(children: ReactNode): string | null {
	const context: Context = {
		registry: defaultRegistry,
		imports: new Map(),
		externalModules: new Set(),
	}

	const jsx = renderNodes(Children.toArray(children), context, '')

	if (context.imports.size === 0) return null

	return assemble(context, jsx)
}

/**
 * Renders a list of React children as a JSX snippet. Pass-through wrappers
 * flatten, text leaves keep their position relative to surrounding elements,
 * and consecutive iterated siblings (3+ identical renders) collapse to a
 * single representative. Authored siblings without keys stay intact.
 */
function renderNodes(nodes: ReactNode[], context: Context, indent: string): string {
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
 * Renders a run of consecutive elements. Iteration-collapse (3+ identical
 * renders → one) applies only to keyed batches; unkeyed siblings pass through
 * untouched.
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

	// Length is >= 2 here (single-element case returned early); the keyed
	// check alone decides iteration-collapse.
	const isIteration = elements.every(hasExplicitKey)

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
	// `.0/.$x`). The check matches the `.$` marker, not a bare `$`.
	return typeof element.key === 'string' && element.key.includes('.$')
}

/**
 * Render a single recognized component element. Unknown components unwrap;
 * their children render in place.
 */
function renderElement(element: ReactElement, context: Context, indent: string): string {
	const info = resolveType(element.type, context)

	if (!info) {
		// Unknown component (e.g. a locally-defined demo wrapper): walk its
		// children for recognizable components.
		const children = elementChildren(element)

		if (children.length > 0) {
			return renderNodes(children, context, indent).trimStart()
		}

		// Self-closing helper with a build-time snippet attached by the
		// docs plugin's `pre` transform: use the raw JSX verbatim.
		const snippet = readSnippet(element.type)

		if (snippet !== null) {
			collectSnippetImports(snippet, context)

			return reindent(snippet, indent)
		}

		return ''
	}

	if (info.module) addImport(context, info.module, info.name, info.external)

	const propParts = formatProps(element.props as Record<string, unknown>, context)

	const childrenStr = renderChildrenContent(elementChildren(element), context, indent + INDENT)

	const open = renderOpenTag(info.name, propParts, indent, childrenStr !== '')

	if (childrenStr === '') return open

	// Short text children render inline between the tags; strip the indent
	// prefix from `childrenStr`.
	if (!childrenStr.includes('\n') && !childrenStr.includes('<')) {
		return `${open}${childrenStr.trimStart()}</${info.name}>`
	}

	return `${open}\n${childrenStr}\n${indent}</${info.name}>`
}

/**
 * Renders the children of a recognized component via `renderNodes`. When
 * children exist but nothing renders, substitutes a `...` placeholder; the
 * parent stays `<Foo>...</Foo>`.
 */
function renderChildrenContent(nodes: ReactNode[], context: Context, indent: string): string {
	if (nodes.length === 0) return ''

	const rendered = renderNodes(nodes, context, indent)

	return rendered !== '' ? rendered : PLACEHOLDER
}
