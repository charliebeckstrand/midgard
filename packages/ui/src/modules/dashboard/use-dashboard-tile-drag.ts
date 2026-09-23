'use client'

import {
	type DraggableAttributes,
	type DraggableSyntheticListeners,
	useDraggable,
} from '@dnd-kit/core'
import { useMemo } from 'react'
import { clamp } from '../../utilities'
import { type DashboardCell, ROW_SUBDIVISION } from './engine/dashboard-layout'
import { useDashboardStore } from './use-dashboard-store'

/** A pointer offset in px. */
type Offset = { x: number; y: number }

/** What {@link useDashboardTileDrag} returns. @internal */
export type DashboardTileDrag = {
	/** Whether this tile is the dragged tile. */
	dragging: boolean
	/** The clamped pointer offset while the tile is dragged, else `null`. */
	carried: Offset | null
	/** The ref for the tile shell. */
	setNodeRef: (element: HTMLElement | null) => void
	/** The props for the drag grip. */
	grip: {
		attributes: DraggableAttributes
		listeners: DraggableSyntheticListeners
		setActivatorNodeRef: (element: HTMLElement | null) => void
	}
}

/**
 * The pointer offset of a dragged tile, clamped so that the tile stays on the
 * canvas and inside its travel range. It returns `null` at rest.
 */
function carriedOffset(
	cell: DashboardCell | undefined,
	transform: Offset | null,
	travel: { maxX: number; maxY: number } | null,
	pitch: number,
): Offset | null {
	if (cell === undefined || transform === null || travel === null || pitch <= 0) return null

	const row = pitch / ROW_SUBDIVISION

	return {
		x: clamp(transform.x, -cell.x * pitch, (travel.maxX - cell.x) * pitch),
		y: clamp(transform.y, -cell.y * row, (travel.maxY - cell.y) * row),
	}
}

/**
 * The drag state of one tile. Only the grip starts a drag. During a drag, the
 * tile reads the travel range and the pitch of the gesture from the store. It
 * clamps the pointer offset with them.
 *
 * @internal
 */
export function useDashboardTileDrag(
	id: string,
	cell: DashboardCell | undefined,
	movable: boolean,
): DashboardTileDrag {
	const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
		useDraggable({ id, disabled: !movable })

	const travel = useDashboardStore((view) => (isDragging ? view.travel : null))

	const pitch = useDashboardStore((_, state) => (isDragging ? (state.gesture?.pitch ?? 0) : 0))

	const carried = useMemo(
		() => (isDragging ? carriedOffset(cell, transform, travel, pitch) : null),
		[isDragging, cell, transform, travel, pitch],
	)

	const grip = useMemo(
		() => ({ attributes, listeners, setActivatorNodeRef }),
		[attributes, listeners, setActivatorNodeRef],
	)

	return { dragging: isDragging, carried, setNodeRef, grip }
}
