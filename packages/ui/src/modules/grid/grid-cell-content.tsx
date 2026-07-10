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
 * @remarks The tooltip machinery mounts on first pointer/focus contact with a
 * cell that measures truncated, not with the cell: the reveal it drives cannot
 * open before contact (or without a clip), and the full floating stack costs
 * real render time per cell — at a few hundred visible cells it was the
 * largest single term in the grid's mount and scroll cost. The wrap reparents
 * the span at that mount; `useTruncation`'s callback ref re-binds its overflow
 * observer to the replacement node, so widening a column back out still
 * re-measures and closes the reveal (the hazard that once kept the tooltip
 * permanently mounted). Truncation measurement also stands down entirely while
 * a drag-resize is in flight — the reveal is held closed through the drag, and
 * the settle re-measures.
 * @internal
 */
export function GridCellContent({ content, tooltip, resizeSettleKey }: GridCellContentProps) {
	const resizing = useGridResizing()

	const [ref, truncated, contacted] = useGridTruncation<HTMLSpanElement>(resizeSettleKey, resizing)

	const span = (
		// `data-grid-content` marks the truncating leaf so the column autosizer can
		// read its intrinsic content width (`scrollWidth`/`Range`), unclipped by the
		// column it's measuring.
		<span ref={ref} data-grid-content className={TRUNCATE_CLASS}>
			{content}
		</span>
	)

	// Mount the reveal machinery only for a cell that is both visited and
	// actually clipped: the wrap reparents the span, and a cell hosting live
	// state below it — an in-place editor, focused and holding a draft — must
	// never be torn down by a passing pointer or its own focus bubbling up. A
	// fitting cell's content (an editor stretched to the column, a short value)
	// measures untruncated, so it stays a bare span through any contact.
	if (tooltip.kind === 'none' || !contacted || !truncated) return span

	const node = tooltip.kind === 'custom' ? tooltip.node : content

	return (
		// `!resizing` holds the tooltip closed through a column drag-resize: the
		// drag reflows the column, and the overflow tooltip would otherwise flash
		// open over the content the resize is reshaping.
		<Tooltip enabled={truncated && !resizing}>
			<TooltipTrigger>{span}</TooltipTrigger>

			<TooltipContent className={TOOLTIP_CLASS}>{node}</TooltipContent>
		</Tooltip>
	)
}

/** The static truncating-span class, composed once — not per rendered cell. @internal */
const TRUNCATE_CLASS = cn(k.cell.truncate)

/** The static tooltip-content class, composed once. @internal */
const TOOLTIP_CLASS = cn(k.cell.tooltip)
