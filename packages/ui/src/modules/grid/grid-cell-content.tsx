'use client'

import {
	type ReactNode,
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'

/**
 * Truncation tooltip for a data cell: `auto` shows the cell's own content when
 * it overflows, `custom` shows a column-supplied node in its place, and `none`
 * suppresses the tooltip while still truncating.
 *
 * @internal
 */
export type CellTooltip = { kind: 'auto' } | { kind: 'custom'; node: ReactNode } | { kind: 'none' }

/**
 * Tracks whether an element's single-line content overflows its box (clipped to
 * an ellipsis). Measured eagerly — after every commit, for content changes, and
 * through a `ResizeObserver`, for width changes that don't re-render — because a
 * {@link Tooltip} won't open mid-hover once its `enabled` flips, so truncation
 * must be known before the pointer arrives.
 *
 * @internal
 */
function useGridCellTruncated<E extends HTMLElement>(): [RefObject<E | null>, boolean] {
	const ref = useRef<E>(null)

	const [truncated, setTruncated] = useState(false)

	// Setting the same value bails out of a re-render, so measuring on every
	// commit can't loop.
	const measure = useCallback(() => {
		const el = ref.current

		if (el) setTruncated(el.scrollWidth > el.clientWidth)
	}, [])

	useLayoutEffect(measure)

	useEffect(() => {
		const el = ref.current

		if (!el || typeof ResizeObserver === 'undefined') return

		const observer = new ResizeObserver(measure)

		observer.observe(el)

		return () => observer.disconnect()
	}, [measure])

	return [ref, truncated]
}

/** Props for {@link GridCellContent}. @internal */
type GridCellContentProps = {
	content: ReactNode
	tooltip: CellTooltip
}

/**
 * Renders a data cell's content on one line, truncated to an ellipsis when it
 * overflows the column width. A truncated cell gains a hover/focus
 * {@link Tooltip} carrying the full content — or a column's `cellTooltip` node in
 * its place — while `none` suppresses it. Only truncated cells mount the
 * tooltip, so an untruncated cell pays none of its cost.
 *
 * @internal
 */
export function GridCellContent({ content, tooltip }: GridCellContentProps) {
	const [ref, truncated] = useGridCellTruncated<HTMLSpanElement>()

	// One element, reused in both branches: when truncation crosses its
	// threshold the span keeps its ref (TooltipTrigger merges onto it).
	const inner = (
		<span ref={ref} className={cn(k.cell.truncate)}>
			{content}
		</span>
	)

	if (tooltip.kind === 'none' || !truncated) return inner

	const node = tooltip.kind === 'custom' ? tooltip.node : content

	return (
		<Tooltip>
			<TooltipTrigger>{inner}</TooltipTrigger>

			<TooltipContent className={cn(k.cell.tooltip)}>{node}</TooltipContent>
		</Tooltip>
	)
}
