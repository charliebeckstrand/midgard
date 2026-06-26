'use client'

import type { ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'
import { truncationTitle, useGridTruncation } from './use-grid-truncation'

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
}

/**
 * Renders a data cell's content on one line, truncated to an ellipsis when it
 * overflows the column width. A truncated cell reveals its full text through the
 * native `title` attribute (`auto`) — no floating portal — while a column's
 * `custom` node opts into a styled hover/focus {@link Tooltip}, and `none`
 * suppresses the reveal.
 *
 * @remarks Defaulting to the native `title` keeps a data grid from mounting a
 * floating-ui portal per cell (one persists per `Tooltip` even while closed),
 * which floods the DOM at scale. The styled tooltip is reserved for the columns
 * that supply a `cellTooltip` node, so the portal cost is paid only where asked.
 * In the custom case the span stays mounted and the tooltip is gated by
 * `enabled`, so the overflow `ResizeObserver` never detaches and widening a
 * column re-measures and closes the tooltip.
 * @internal
 */
export function GridCellContent({ content, tooltip }: GridCellContentProps) {
	const [ref, truncated] = useGridTruncation<HTMLSpanElement>()

	// A custom node gets the styled floating tooltip — opt-in per column, so it
	// can't flood the DOM with a portal per cell.
	if (tooltip.kind === 'custom') {
		return (
			<Tooltip enabled={truncated}>
				<TooltipTrigger>
					<span ref={ref} className={cn(k.cell.truncate)}>
						{content}
					</span>
				</TooltipTrigger>

				<TooltipContent className={cn(k.cell.tooltip)}>{tooltip.node}</TooltipContent>
			</Tooltip>
		)
	}

	// `auto` reveals the full text via the native title (no portal); `none` omits it.
	const title = tooltip.kind === 'auto' ? truncationTitle(content, ref, truncated) : undefined

	return (
		<span ref={ref} className={cn(k.cell.truncate)} title={title}>
			{content}
		</span>
	)
}
