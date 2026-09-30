'use client'

import { Children, cloneElement, isValidElement, type ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'
import { useGridHighlight } from './context'

/** The static highlight-mark class, composed once — not per marked run. @internal */
const MARK_CLASS = cn(k.cell.mark)

/**
 * The lowercased form of `text`, with the original span of each of its code
 * units. A character such as `İ` lowercases to two code units, so an offset in
 * the lowered text is not an offset in the original. `from[i]` and `to[i]` are
 * the start and the end, in `text`, of the character that lowered unit `i`
 * comes from. @internal
 */
function lowerWithSpans(text: string): { lower: string; from: number[]; to: number[] } {
	let lower = ''

	const from: number[] = []

	const to: number[] = []

	let at = 0

	for (const char of text) {
		const lowered = char.toLowerCase()

		const next = at + char.length

		for (let unit = 0; unit < lowered.length; unit++) {
			from.push(at)

			to.push(next)
		}

		lower += lowered

		at = next
	}

	return { lower, from, to }
}

/**
 * Splits a plain-text run into its unmarked segments and `<mark>`-wrapped
 * matches — every case-insensitive occurrence of `query`, its original casing
 * preserved. Returns the string untouched when it holds no match, so a
 * non-matching cell keeps its bare text node rather than an array wrapper.
 *
 * The scan runs on the lowered text. When lowering keeps the length, each
 * lowered offset is the original offset. Otherwise the offsets map back
 * through {@link lowerWithSpans}.
 *
 * @param lowerQuery - `query` pre-lowercased, so the scan lowercases only the
 *   text; the match slice still comes from the original run.
 * @internal
 */
function markString(text: string, lowerQuery: string): ReactNode {
	let lowerText = text.toLowerCase()

	let from = lowerText.indexOf(lowerQuery)

	if (from === -1) return text

	// The common case keeps the length, and pays for no map.
	const spans = lowerText.length === text.length ? null : lowerWithSpans(text)

	if (spans) {
		lowerText = spans.lower

		from = lowerText.indexOf(lowerQuery)

		if (from === -1) return text
	}

	const segments: ReactNode[] = []

	let last = 0

	let key = 0

	while (from !== -1) {
		const lowerEnd = from + lowerQuery.length

		const start = spans ? (spans.from[from] as number) : from

		const end = spans ? (spans.to[lowerEnd - 1] as number) : lowerEnd

		if (start > last) segments.push(text.slice(last, start))

		segments.push(
			<mark key={key++} className={MARK_CLASS}>
				{text.slice(start, end)}
			</mark>,
		)

		last = end

		from = lowerText.indexOf(lowerQuery, lowerEnd)
	}

	if (last < text.length) segments.push(text.slice(last))

	return segments
}

/**
 * Marks every occurrence of `query` in a cell's rendered content, walking into
 * string and number leaves. Those leaves include ones nested inside a custom
 * `cell` node, whose elements are cloned around their re-marked children. Any
 * non-text node (an icon, an image) stays untouched. Case-insensitive, matching the
 * quick-search's `includesString`; the empty query is a no-op that returns the
 * node as-is.
 *
 * @remarks A literal substring scan, not a regex, so a query carrying regex
 * metacharacters marks literally and no escaping is needed.
 * @internal
 */
export function highlightMatches(node: ReactNode, query: string): ReactNode {
	if (query === '') return node

	return walk(node, query.toLowerCase())
}

/** Recurses the node tree, marking text leaves and cloning elements around their marked children. @internal */
function walk(node: ReactNode, lowerQuery: string): ReactNode {
	// String() is identity on a string, so both text-leaf kinds share one scan.
	if (typeof node === 'string' || typeof node === 'number') {
		return markString(String(node), lowerQuery)
	}

	if (Array.isArray(node)) {
		return Children.map(node, (child) => walk(child, lowerQuery))
	}

	if (isValidElement(node)) {
		const children = (node.props as { children?: ReactNode }).children

		if (children == null) return node

		return cloneElement(node, undefined, walk(children, lowerQuery))
	}

	return node
}

/**
 * Marks the matches of the highlight search in the content of a cell. It reads
 * the query itself, so a new query renders this node and not the cell around it.
 *
 * @internal
 */
function GridHighlighted({ children }: { children: ReactNode }): ReactNode {
	const query = useGridHighlight()

	return query == null ? children : highlightMatches(children, query)
}

/**
 * The content of a cell of `column`, set to mark the matches of the highlight
 * search. The search scans only a column with a `value`, so the cell of any
 * other column reads no query, and a new query does not render it.
 *
 * @internal
 */
export function searchedContent(column: { value?: unknown }, content: ReactNode): ReactNode {
	return column.value != null && content != null ? (
		<GridHighlighted>{content}</GridHighlighted>
	) : (
		content
	)
}
