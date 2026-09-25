'use client'

import type { KeyboardEvent } from 'react'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/dashboard'
import { useDashboardActions } from './context'
import type { DashboardCell } from './engine/dashboard-layout'
import type { DashboardResizeEdge, DashboardResizeRange } from './engine/dashboard-resize'

/** Props for {@link DashboardResizeHandle}. @internal */
export type DashboardResizeHandleProps = {
	/** The id of the tile. */
	id: string
	/** The edge that the handle drives. */
	edge: DashboardResizeEdge
	/** The painted cell of the tile. */
	cell: DashboardCell
	/** The spans that a resize of the tile can reach. The splitter reports them, widened to hold the span of the cell. */
	range: DashboardResizeRange
	/** The name of the tile, for the accessible name of the splitter. */
	label: string
	/** Whether this tile resizes now. */
	resizing: boolean
}

/** The arrow keys that step each edge, as a change of width and height in grid units. */
const STEPS: Record<string, readonly [number, number]> = {
	ArrowRight: [1, 0],
	ArrowLeft: [-1, 0],
	ArrowDown: [0, 1],
	ArrowUp: [0, -1],
}

/**
 * One resize splitter of a tile in edit mode. A pointer drag resizes the tile
 * live; the arrow keys on a focused splitter step it by one grid unit and commit
 * at once. The corner takes the pointer only, because the two edges already
 * serve the keyboard. Each edge reports the span on its axis, and the range that
 * the limits of the tile allow.
 *
 * @remarks
 * A saved span can be outside the limits, because the saved layout renders as
 * saved. The reported range then widens to hold the span, so the value never
 * falls outside it. The resize still clamps into the limits.
 *
 * @internal
 */
export function DashboardResizeHandle({
	id,
	edge,
	cell,
	range,
	label,
	resizing,
}: DashboardResizeHandleProps) {
	const { beginResize, resizeBy } = useDashboardActions()

	const horizontal = edge === 's'

	const span = horizontal ? cell.h : cell.w

	const least = Math.min(horizontal ? range.minH : range.minW, span)

	// The south edge of a free-form tile has no most height unless the tile sets one.
	const most = horizontal ? range.maxH : range.maxW

	const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
		const step = STEPS[event.key]

		if (step === undefined) return

		const [dw, dh] = step

		if ((horizontal ? dh : dw) === 0) return

		event.preventDefault()

		resizeBy(id, edge, dw, dh)
	}

	const keyboard =
		edge === 'se'
			? { 'aria-hidden': true }
			: {
					role: 'separator',
					tabIndex: 0,
					'aria-orientation': horizontal ? ('horizontal' as const) : ('vertical' as const),
					'aria-label': `Resize ${label}`,
					'aria-valuenow': span,
					'aria-valuemin': least,
					'aria-valuemax': most === undefined ? undefined : Math.max(most, span),
					onKeyDown,
				}

	return (
		<div
			data-slot="dashboard-resize-handle"
			data-edge={edge}
			data-resizing={dataAttr(resizing)}
			className={cn(k.resizeHandle({ edge }))}
			onPointerDown={(event) => beginResize(id, edge, event)}
			{...keyboard}
		/>
	)
}
