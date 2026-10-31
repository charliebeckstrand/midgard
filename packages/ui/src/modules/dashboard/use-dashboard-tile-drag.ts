'use client'

import {
	type DraggableAttributes,
	type DraggableSyntheticListeners,
	useDraggable,
} from '@dnd-kit/core'
import { type RefObject, useCallback, useLayoutEffect, useMemo, useState } from 'react'
import { reorderMessages } from '../../primitives/intl/intl-reorder'
import { useIntl } from '../../primitives/intl/use-intl'
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

/** No offset. */
const ORIGIN: DashboardOffset = { x: 0, y: 0 }

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
 * In the re-pack, the dragged tile takes its landing shelf, so the tile moves
 * in the flow. The tile then measures its layout box after each move, and it
 * takes the move out of the pointer offset. It therefore stays under the pointer.
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
	const intl = useIntl()

	const { attributes, listeners, setNodeRef, node, setActivatorNodeRef, transform, isDragging } =
		useDraggable({
			id,
			disabled: !movable,
			attributes: { roleDescription: intl.formatMessage(reorderMessages.draggableRole) },
		})

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

	const stacked = useDashboardStore(
		useCallback((view: DashboardView) => dragging && view.projected, [dragging]),
	)

	// The move of the layout box of the tile since the start of a drag in the re-pack.
	const [moved, setMoved] = useState<{ start: DashboardOffset; by: DashboardOffset } | null>(null)

	useLayoutEffect(() => {
		const el = node.current

		if (!stacked || el === null || cell === undefined) {
			setMoved(null)

			return
		}

		const at = { x: el.offsetLeft, y: el.offsetTop }

		setMoved((prev) => {
			const start = prev?.start ?? at

			const by = { x: at.x - start.x, y: at.y - start.y }

			return prev?.by.x === by.x && prev.by.y === by.y ? prev : { start, by }
		})
	}, [stacked, cell, node])

	const carried = useMemo(() => {
		if (!dragging) return null

		if (!stacked) return carriedOffset(cell, transform, travel, pitch, inline)

		const by = moved?.by ?? ORIGIN

		return transform === null ? null : { x: transform.x - by.x, y: transform.y - by.y }
	}, [dragging, stacked, moved, cell, transform, travel, pitch, inline])

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
