'use client'

import {
	type DraggableAttributes,
	type DraggableSyntheticListeners,
	useDraggable,
} from '@dnd-kit/core'
import { type RefObject, useCallback, useMemo } from 'react'
import {
	type DashboardDragTravel,
	type DashboardOffset,
	travelOffset,
} from './engine/dashboard-drag'
import type { DashboardCell } from './engine/dashboard-layout'
import type { DashboardState, DashboardView } from './engine/dashboard-store'
import { useDashboardStore } from './use-dashboard-store'

/** What {@link useDashboardTileDrag} returns. @internal */
export type DashboardTileDrag = {
	/** Whether the store gesture drags this tile. */
	dragging: boolean
	/** The clamped pointer offset while the tile is dragged, else `null`. */
	carried: DashboardOffset | null
	/** The ref for the tile shell. */
	setNodeRef: (element: HTMLElement | null) => void
	/** The tile shell, which `setNodeRef` holds. */
	node: RefObject<HTMLElement | null>
	/** The props for the drag grip: the pointer and keyboard activator. */
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
	transform: DashboardOffset | null,
	travel: DashboardDragTravel | null,
	pitch: number,
	inline: 1 | -1,
): DashboardOffset | null {
	if (cell === undefined || transform === null || travel === null || pitch <= 0) return null

	return travelOffset(cell, transform, travel, pitch, inline)
}

/**
 * The drag state of one tile. A pointer and the keyboard start a drag only
 * from the grip, so the rest of the card keeps touch scrolling. During a
 * drag, the tile reads the travel range and the pitch of the gesture from the
 * store. It clamps the pointer offset with them. The tile lifts only while the
 * store gesture drags it, and not for each drag that dnd-kit runs.
 *
 * @remarks
 * The `Dashboard` holds the Escape layer and the grabbing cursor of a drag. They
 * stay until the gesture ends, also when the tile unmounts first.
 *
 * @internal
 */
export function useDashboardTileDrag(
	id: string,
	cell: DashboardCell | undefined,
	movable: boolean,
): DashboardTileDrag {
	const { attributes, listeners, setNodeRef, node, setActivatorNodeRef, transform, isDragging } =
		useDraggable({ id, disabled: !movable })

	const owned = useDashboardStore(
		useCallback(
			(_: DashboardView, state: DashboardState) =>
				state.gesture?.kind === 'drag' && state.gesture.id === id,
			[id],
		),
	)

	// The store gesture owns the drag. A dnd-kit drag that the board refused or
	// canceled lifts nothing.
	const dragging = isDragging && owned

	const travel = useDashboardStore(
		useCallback((view: DashboardView) => (dragging ? view.travel : null), [dragging]),
	)

	const pitch = useDashboardStore(
		useCallback(
			(_: DashboardView, state: DashboardState) => (dragging ? (state.gesture?.pitch ?? 0) : 0),
			[dragging],
		),
	)

	const inline = useDashboardStore(
		useCallback(
			(_: DashboardView, state: DashboardState) => (dragging ? (state.gesture?.inline ?? 1) : 1),
			[dragging],
		),
	)

	const carried = useMemo(
		() => (dragging ? carriedOffset(cell, transform, travel, pitch, inline) : null),
		[dragging, cell, transform, travel, pitch, inline],
	)

	// dnd-kit presses the grip for each of its drags, so the pressed state
	// follows the gesture.
	const grip = useMemo(
		() => ({
			attributes: { ...attributes, 'aria-pressed': dragging || undefined },
			listeners,
			setActivatorNodeRef,
		}),
		[attributes, dragging, listeners, setActivatorNodeRef],
	)

	return { dragging, carried, setNodeRef, node, grip }
}
