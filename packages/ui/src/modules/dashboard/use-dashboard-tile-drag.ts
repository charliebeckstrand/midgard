'use client'

import {
	type DraggableAttributes,
	type DraggableSyntheticListeners,
	useDraggable,
} from '@dnd-kit/core'
import { type PointerEventHandler, type PointerEvent as ReactPointerEvent, useMemo } from 'react'
import { useEscapeLayer } from '../../hooks'
import { clamp, noop } from '../../utilities'
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
	/** The props for the drag grip: the keyboard activator. */
	grip: {
		attributes: DraggableAttributes
		listeners: DraggableSyntheticListeners
		setActivatorNodeRef: (element: HTMLElement | null) => void
	}
	/** The pointer listener for the card, so a drag can start anywhere on the tile. */
	surface: { onPointerDown?: PointerEventHandler<HTMLElement> }
}

/**
 * The pointer offset of a dragged tile, clamped so that the tile stays on the
 * canvas and inside its travel range. The range is in columns, so a right-to-left
 * board flips the horizontal offset into columns and back. It returns `null` at
 * rest.
 */
function carriedOffset(
	cell: DashboardCell | undefined,
	transform: Offset | null,
	travel: { maxX: number; maxY: number } | null,
	pitch: number,
	inline: 1 | -1,
): Offset | null {
	if (cell === undefined || transform === null || travel === null || pitch <= 0) return null

	const row = pitch / ROW_SUBDIVISION

	return {
		x: inline * clamp(inline * transform.x, -cell.x * pitch, (travel.maxX - cell.x) * pitch),
		y: clamp(transform.y, -cell.y * row, (travel.maxY - cell.y) * row),
	}
}

/**
 * The drag state of one tile. A pointer starts a drag anywhere on the card, and
 * the keyboard starts one from the grip. During a drag, the
 * tile reads the travel range and the pitch of the gesture from the store. It
 * clamps the pointer offset with them.
 *
 * @remarks
 * While the tile drags, the drag is the top dismiss layer. An Escape press
 * then cancels only the drag, and a dialog, sheet, or drawer around the board
 * stays open.
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

	// The layer only takes the press from the surfaces under it. dnd-kit cancels the drag.
	useEscapeLayer({ open: isDragging, onDismiss: noop })

	const travel = useDashboardStore((view) => (isDragging ? view.travel : null))

	const pitch = useDashboardStore((_, state) => (isDragging ? (state.gesture?.pitch ?? 0) : 0))

	const inline = useDashboardStore((_, state) => (isDragging ? (state.gesture?.inline ?? 1) : 1))

	const carried = useMemo(
		() => (isDragging ? carriedOffset(cell, transform, travel, pitch, inline) : null),
		[isDragging, cell, transform, travel, pitch, inline],
	)

	// The pointer sensor rides the card and the keyboard sensor rides the grip, so
	// neither event reaches the same sensor twice.
	const grip = useMemo(() => {
		const onKeyDown = listeners?.onKeyDown

		return {
			attributes,
			listeners: onKeyDown === undefined ? undefined : { onKeyDown },
			setActivatorNodeRef,
		}
	}, [attributes, listeners, setActivatorNodeRef])

	const surface = useMemo(() => {
		const onPointerDown = listeners?.onPointerDown

		if (onPointerDown === undefined) return {}

		return { onPointerDown: (event: ReactPointerEvent<HTMLElement>) => onPointerDown(event) }
	}, [listeners])

	return { dragging: isDragging, carried, setNodeRef, grip, surface }
}
