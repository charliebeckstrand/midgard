'use client'

import { memo, useCallback, useLayoutEffect } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/dashboard'
import { useDashboardActions } from './context'
import { DashboardResizeHandle } from './dashboard-resize-handle'
import type { DashboardCell } from './engine/dashboard-layout'
import { resizeFloor, resizeLimits, resizeRange } from './engine/dashboard-resize'
import type { DashboardState, DashboardView } from './engine/dashboard-store'
import { useDashboardStore } from './use-dashboard-store'

/** Props for {@link DashboardTileEdges}. @internal */
export type DashboardTileEdgesProps = {
	/** The id of the tile. */
	id: string
	/** The painted cell of the tile. */
	cell: DashboardCell
	/** The name of the tile. */
	label: string
	/** Whether the tile has a free height. A tile with a fixed ratio has no south edge. */
	freeHeight: boolean
	/** Whether the tile resizes now. */
	resizing: boolean
}

/** The column count of the board. */
const selectColumns = (_: DashboardView, state: DashboardState) => state.columns

/**
 * The resize splitters of a tile in edit mode, and the span chip while it
 * resizes. The east edge and the corner always show; the south edge shows only
 * on a free-form tile. The cell keeps its object while its geometry holds, so a
 * drag renders no splitter of a tile that it does not move.
 *
 * Each splitter reports the range that a resize of the tile can reach. The
 * range comes from the limits of the tile, as the resize reads them. A saved
 * span outside the limits widens the reported range to hold it.
 *
 * @remarks
 * A pointer resize listens on its splitter. When the splitters unmount, for
 * example with a tile that the app removes, a live resize of the tile ends as
 * canceled.
 *
 * @internal
 */
export const DashboardTileEdges = memo(function DashboardTileEdges({
	id,
	cell,
	label,
	freeHeight,
	resizing,
}: DashboardTileEdgesProps) {
	const { cancelResize } = useDashboardActions()

	// A detached splitter gets no release, so the gesture ends here, before the board paints.
	useLayoutEffect(() => () => cancelResize(id), [cancelResize, id])

	const columns = useDashboardStore(selectColumns)

	const demand = useDashboardStore(
		useCallback((_: DashboardView, state: DashboardState) => state.demands.get(id), [id]),
	)

	// The floor follows the canvas width, which changes on each frame of a container
	// resize. The selector returns a whole span, so the splitters render again only when it changes.
	const floor = useDashboardStore(
		useCallback(
			(_: DashboardView, { columns, gap, width, demands }: DashboardState) =>
				resizeFloor(demands.get(id), { columns, gap, pitch: width / columns }),
			[id],
		),
	)

	const range = resizeRange(resizeLimits(demand, columns, floor), cell.x)

	const shared = { id, cell, range, label, resizing }

	return (
		<>
			<DashboardResizeHandle edge="e" {...shared} />

			{freeHeight && <DashboardResizeHandle edge="s" {...shared} />}

			<DashboardResizeHandle edge="se" {...shared} />

			{resizing && (
				<div data-slot="dashboard-resize-readout" className={cn(k.readout)}>
					{cell.w} × {cell.h}
				</div>
			)}
		</>
	)
})
