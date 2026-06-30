'use client'

import type { ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'
import { useGridResizing } from './context'
import { useGridTruncation } from './use-grid-truncation'

/**
 * Truncation tooltip for a data cell: `auto` shows the cell's own content when
 * it overflows, `custom` shows a column-supplied node in its place, and `none`
 * suppresses the tooltip while still truncating.
 *
 * @internal
 */
export type CellTooltip = { kind: 'auto' } | { kind: 'custom'; node: ReactNode } | { kind: 'none' }

/** Props for {@link GridCellContent}. @internal */
type GridCellContentProps = {
	content: ReactNode
	tooltip: CellTooltip
	/**
	 * This cell's column width, frozen to `undefined` while a drag is in flight
	 * and the settled engine width otherwise; its change after a resize settles
	 * (or a keyboard nudge) re-renders the memoized cell and re-measures overflow.
	 */
	resizeSettleKey: number | undefined
}

/**
 * Renders a data cell's content on one line, truncated to an ellipsis when it
 * overflows the column width. A truncated cell gains a hover/focus
 * {@link Tooltip} carrying the full content — or a column's `cellTooltip` node in
 * its place — while `none` suppresses it.
 *
 * @remarks The tooltip stays mounted and is gated by its `enabled` prop rather
 * than mounted only while truncated: keeping the span in place means the overflow
 * `ResizeObserver` never detaches, so widening a column back out re-measures and
 * `enabled` closes the tooltip. (Remounting the span on every truncation toggle
 * stranded the observer on the old node, leaving a stale tooltip.) The closed
 * tooltip renders no surface, so an untruncated cell adds no DOM.
 * @internal
 */
export function GridCellContent({ content, tooltip, resizeSettleKey }: GridCellContentProps) {
	const resizing = useGridResizing()

	const [ref, truncated] = useGridTruncation<HTMLSpanElement>(resizeSettleKey)

	const span = (
		// `data-grid-content` marks the truncating leaf so the column autosizer can
		// read its intrinsic content width (`scrollWidth`/`Range`), unclipped by the
		// column it's measuring.
		<span ref={ref} data-grid-content className={cn(k.cell.truncate)}>
			{content}
		</span>
	)

	if (tooltip.kind === 'none') return span

	const node = tooltip.kind === 'custom' ? tooltip.node : content

	return (
		// `!resizing` holds the tooltip closed through a column drag-resize: the
		// drag reflows the column, and the overflow tooltip would otherwise flash
		// open over the content the resize is reshaping.
		<Tooltip enabled={truncated && !resizing}>
			<TooltipTrigger>{span}</TooltipTrigger>

			<TooltipContent className={cn(k.cell.tooltip)}>{node}</TooltipContent>
		</Tooltip>
	)
}
