'use client'

import { cn } from '../../core'
import { k } from '../../recipes/kata/dashboard'
import { DashboardResizeHandle } from './dashboard-resize-handle'
import type { DashboardCell } from './engine/dashboard-layout'

/** Props for {@link DashboardTileEdges}. @internal */
export type DashboardTileEdgesProps = {
	/** The id of the tile. */
	id: string
	/** The painted cell of the tile. */
	cell: DashboardCell
	/** The column count. */
	columns: number
	/** The name of the tile. */
	label: string
	/** Whether the tile has a free height. A tile with a fixed ratio has no south edge. */
	freeHeight: boolean
	/** Whether the tile resizes now. */
	resizing: boolean
}

/**
 * The resize splitters of a tile in edit mode, and the span chip while it
 * resizes. The east edge and the corner always show; the south edge shows only
 * on a free-form tile.
 *
 * @internal
 */
export function DashboardTileEdges({
	id,
	cell,
	columns,
	label,
	freeHeight,
	resizing,
}: DashboardTileEdgesProps) {
	const shared = { id, cell, columns, label, resizing }

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
}
