'use client'

import type { KeyboardEvent } from 'react'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/dashboard'
import { type DashboardResizeEdge, useDashboard } from './context'
import { minColumns } from './dashboard-constraints'
import { type LayoutCell, ROW_SUBDIVISION } from './dashboard-layout'

/** Props for {@link DashboardResizeHandle}. @internal */
export type DashboardResizeHandleProps = {
	/** The tile this handle resizes. */
	id: string
	/** Which edge it rides: `e` for width, `s` for height, `se` for both. */
	edge: DashboardResizeEdge
	/** The tile's painted cell, for the separator's value semantics. */
	cell: LayoutCell
	/** The tile's minimum content width in px, for the width clamp's floor. */
	minWidth: number
}

/**
 * The keyboard step a resize handle's key maps to, in grid units along its
 * axis — one unit per arrow, a column-pitch stride with Shift, and the full
 * clamp range for Home / End (the caller's clamps absorb the overshoot).
 *
 * @internal
 */
function resizeStep(event: KeyboardEvent, horizontal: boolean, span: number): number {
	const stride = event.shiftKey ? ROW_SUBDIVISION : 1

	switch (event.key) {
		case horizontal ? 'ArrowRight' : 'ArrowDown':
			return stride

		case horizontal ? 'ArrowLeft' : 'ArrowUp':
			return -stride

		case 'End':
			return span

		case 'Home':
			return -span

		default:
			return 0
	}
}

/**
 * One resize handle on a tile's edge. The east and south strips are real
 * window splitters — focusable `role="separator"` carrying the span as
 * `aria-valuenow` (its change is the announcement), arrows stepping one
 * grid unit, Shift-arrows a column pitch, Home / End the clamps — while the
 * corner is a pointer-only convenience the two splitters already cover, so
 * it stays out of the accessibility tree rather than lying about being a
 * one-dimensional separator. Ratio-locked tiles mount no south strip: their
 * height belongs to the ratio.
 *
 * @internal
 */
export function DashboardResizeHandle({ id, edge, cell, minWidth }: DashboardResizeHandleProps) {
	const { columns, gap, columnPitch, beginResize, resizeBy, resizingId } = useDashboard()

	const horizontal = edge === 'e'

	const min =
		columnPitch > 0 && horizontal
			? minColumns(minWidth, gap, columnPitch, columns)
			: ROW_SUBDIVISION

	const max = horizontal ? columns - cell.x : columns * ROW_SUBDIVISION

	const separator =
		edge === 'se'
			? { 'aria-hidden': true as const }
			: {
					role: 'separator' as const,
					tabIndex: 0,
					// The separator's orientation is the line it draws, not the axis it moves.
					'aria-orientation': horizontal ? ('vertical' as const) : ('horizontal' as const),
					'aria-label': horizontal ? `Resize ${id} width` : `Resize ${id} height`,
					'aria-valuenow': horizontal ? cell.w : cell.h,
					'aria-valuemin': min,
					'aria-valuemax': max,
					onKeyDown: (event: KeyboardEvent) => {
						const step = resizeStep(event, horizontal, max)

						if (step === 0) return

						event.preventDefault()

						resizeBy(id, edge, horizontal ? step : 0, horizontal ? 0 : step)
					},
				}

	return (
		<div
			data-slot="dashboard-resize-handle"
			data-edge={edge}
			data-resizing={dataAttr(resizingId === id)}
			className={cn(k.resizeHandle({ edge }))}
			onPointerDown={(event) => beginResize(id, edge, event)}
			{...separator}
		/>
	)
}
