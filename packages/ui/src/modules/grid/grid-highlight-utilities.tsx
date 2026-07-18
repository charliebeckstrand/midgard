'use client'

import { Children, cloneElement, isValidElement, type ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'

/** The static highlight-mark class, composed once — not per marked run. @internal */
const MARK_CLASS = cn(k.cell.mark)

/**
 * Splits a plain-text run into its unmarked segments and `<mark>`-wrapped
 * matches — every case-insensitive occurrence of `query`, its original casing
 * preserved. Returns the string untouched when it holds no match, so a
 * non-matching cell keeps its bare text node rather than an array wrapper.
 *
 * @param lowerQuery - `query` pre-lowercased, so the scan lowercases only the
 *   text; the match slice still comes from the original run.
 * @internal
 */
function markString(text: string, query: string, lowerQuery: string): ReactNode {
	const lowerText = text.toLowerCase()

	let from = lowerText.indexOf(lowerQuery)

	if (from === -1) return text

	const segments: ReactNode[] = []

	let last = 0

	let key = 0

	while (from !== -1) {
		if (from > last) segments.push(text.slice(last, from))

		const end = from + query.length

		segments.push(
			<mark key={key++} className={MARK_CLASS}>
				{text.slice(from, end)}
			</mark>,
		)

		last = end

		from = lowerText.indexOf(lowerQuery, end)
	}

	if (last < text.length) segments.push(text.slice(last))

	return segments
}

/**
 * Marks every occurrence of `query` in a cell's rendered content, walking into
 * string and number leaves — including those nested inside a custom `cell` node,
 * whose elements are cloned around their re-marked children — and leaving any
 * non-text node (an icon, an image) untouched. Case-insensitive, matching the
 * quick-search's `includesString`; the empty query is a no-op that returns the
 * node as-is.
 *
 * @remarks A literal substring scan, not a regex, so a query carrying regex
 * metacharacters marks literally and no escaping is needed.
 * @internal
 */
export function highlightMatches(node: ReactNode, query: string): ReactNode {
	if (query === '') return node

	return walk(node, query, query.toLowerCase())
}

/** Recurses the node tree, marking text leaves and cloning elements around their marked children. @internal */
function walk(node: ReactNode, query: string, lowerQuery: string): ReactNode {
	// String() is identity on a string, so both text-leaf kinds share one scan.
	if (typeof node === 'string' || typeof node === 'number') {
		return markString(String(node), query, lowerQuery)
	}

	if (Array.isArray(node)) {
		return Children.map(node, (child) => walk(child, query, lowerQuery))
	}

	if (isValidElement(node)) {
		const children = (node.props as { children?: ReactNode }).children

		if (children == null) return node

		return cloneElement(node, undefined, walk(children, query, lowerQuery))
	}

	return node
}
