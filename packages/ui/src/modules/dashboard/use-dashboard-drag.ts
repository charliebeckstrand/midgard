'use client'

import type {
	Announcements,
	DndContextProps,
	DragMoveEvent,
	DragStartEvent,
	KeyboardCoordinateGetter,
} from '@dnd-kit/core'
import { type RefObject, useCallback, useMemo, useRef } from 'react'
import { useSortableSensors } from '../../hooks'
import { clamp } from '../../utilities'
import { type DashboardCommit, endGesture, measureGesture } from './dashboard-gesture'
import {
	describeDragCancel,
	describeDragEnd,
	describeDragMove,
	describeDragStart,
} from './engine/dashboard-announcements'
import { dragPreview, dragTravel } from './engine/dashboard-drag'
import { type DashboardCell, ROW_SUBDIVISION } from './engine/dashboard-layout'
import type { DashboardStore } from './engine/dashboard-store'
import type { DashboardGestureEndEvent, DashboardGestureStartEvent } from './types'

/** Options for {@link useDashboardDrag}. @internal */
export type DashboardDragOptions = {
	/** The store of the dashboard. */
	store: DashboardStore
	/** The canvas element, which gives the column pitch at the start of a drag. */
	canvasRef: RefObject<HTMLElement | null>
	/** Commits the cells of a preview, and returns what the commit leaves. */
	commit: (cells: readonly DashboardCell[]) => DashboardCommit
	/** Receives the start of each drag. */
	onDragStart?: (event: DashboardGestureStartEvent) => void
	/** Receives the end of each drag. */
	onDragEnd?: (event: DashboardGestureEndEvent) => void
}

/** What {@link useDashboardDrag} returns. @internal */
export type DashboardDragHandlers = {
	/** The props for `DndContext`. */
	context: DndContextProps
	/**
	 * Ends the live drag as canceled, and ends the dnd-kit drag with it. It does
	 * nothing when no drag is live.
	 */
	cancelDrag: () => void
}

/** The last drag that dnd-kit started. */
type SensedDrag = {
	/** The id of the dragged tile. */
	id: string
	/** Whether the store gesture owns the drag. A drag that the board refused or canceled does not. */
	owned: boolean
	/** Whether dnd-kit still runs the drag. */
	live: boolean
	/** The window of the canvas, where the dnd-kit sensors listen. */
	view: Window | null
	/** Whether the task of the lift is over, so the sensor can cancel at once. */
	attached: boolean
	/** Whether the board canceled the drag in the task of the lift, so the sensor cancels later. */
	pending: boolean
}

/**
 * Ends the dnd-kit drag through its own cancel path. The library has no cancel for
 * a caller outside its sensors, but each sensor cancels on a resize of its window.
 * The sensor then lets go of the keys and the pointer of the page. Each other
 * resize listener of the window also receives the event.
 */
function cancelSensor(drag: SensedDrag): void {
	if (drag.live) drag.view?.dispatchEvent(new Event('resize'))
}

/** The name that the live region reads for a tile. */
function labelOf(store: DashboardStore, id: string): string {
	return store.getState().demands.get(id)?.label ?? id
}

/** The cell of `id` in the preview of the live drag, else in its snapshot. */
function currentCell(store: DashboardStore, id: string): DashboardCell | null {
	const gesture = store.getState().gesture

	const cells = gesture?.preview ?? gesture?.snapshot ?? []

	return cells.find((cell) => cell.id === id) ?? null
}

/**
 * The drag orchestration of the dashboard. dnd-kit supplies the sensors, the
 * keyboard, and the live region. The policy is the pure {@link dragPreview}, and
 * it reads only the snapshot from the start of the drag.
 *
 * The traveling tile decides the target, not the pointer. The target is the
 * start cell plus the pointer delta in grid units, rounded and clamped to the
 * travel range. Nothing re-simulates until the target changes by a whole unit.
 *
 * @returns The props for `DndContext`, and the cancel of the live drag.
 * @internal
 */
export function useDashboardDrag({
	store,
	canvasRef,
	commit,
	onDragStart,
	onDragEnd,
}: DashboardDragOptions): DashboardDragHandlers {
	/** The last target, so a move inside one unit does nothing. */
	const targetRef = useRef<{ x: number; y: number } | null>(null)

	const callbacks = useRef({ commit, onDragStart, onDragEnd })

	callbacks.current = { commit, onDragStart, onDragEnd }

	// The announcements read it after the end of the drag, so it stays until the next start.
	const sensed = useRef<SensedDrag | null>(null)

	const handleDragStart = useCallback(
		(event: DragStartEvent) => {
			const id = String(event.active.id)

			const canvas = canvasRef.current

			const measure = measureGesture(store, canvas)

			const view = canvas?.ownerDocument.defaultView ?? null

			const drag: SensedDrag = {
				id,
				owned: measure !== null,
				live: true,
				view,
				attached: false,
				pending: false,
			}

			sensed.current = drag

			// The keyboard sensor queues its keydown listener in a timer after this call. A cancel
			// in this task would detach the sensor before that timer, and the late listener would
			// hold the next end key. So such a cancel waits for a timer after the timer of the sensor.
			setTimeout(() => {
				drag.attached = true

				if (drag.pending) setTimeout(() => cancelSensor(drag))
			})

			if (measure === null) return

			const { snapshot, pitch, inline } = measure

			targetRef.current = null

			const { width, layout } = store.getState()

			store.setState({
				gesture: {
					kind: 'drag',
					id,
					snapshot,
					preview: null,
					change: null,
					partner: null,
					width,
					pitch,
					inline,
				},
			})

			callbacks.current.onDragStart?.({ id, layout })
		},
		[store, canvasRef],
	)

	const handleDragMove = useCallback(
		(event: DragMoveEvent) => {
			const { gesture, columns } = store.getState()

			if (gesture?.kind !== 'drag' || gesture.pitch <= 0) return

			const origin = gesture.snapshot.find((cell) => cell.id === gesture.id)

			if (origin === undefined) return

			const travel = dragTravel(gesture.snapshot, gesture.id, columns)

			// In a right-to-left board a travel to the right moves toward column 0.
			const dx = (gesture.inline * event.delta.x) / gesture.pitch

			const x = Math.round(clamp(origin.x + dx, 0, travel.maxX))

			const y = Math.round(
				clamp(origin.y + (event.delta.y * ROW_SUBDIVISION) / gesture.pitch, 0, travel.maxY),
			)

			const last = targetRef.current

			if (last !== null && last.x === x && last.y === y) return

			targetRef.current = { x, y }

			const preview = dragPreview(gesture.snapshot, gesture.id, x, y, columns)

			store.setState({
				gesture: {
					...gesture,
					preview: preview?.cells ?? null,
					change: preview?.kind ?? null,
					partner: preview?.partner ?? null,
				},
			})
		},
		[store],
	)

	/** Ends the live drag: `keep` commits its preview, else it returns to the snapshot. */
	const finishDrag = useCallback(
		(keep: boolean) => {
			const gesture = store.getState().gesture

			if (gesture?.kind !== 'drag') return

			targetRef.current = null

			endGesture(store, gesture.id, keep, {
				commit: callbacks.current.commit,
				onEnd: callbacks.current.onDragEnd,
			})
		},
		[store],
	)

	/** Receives the end of the dnd-kit drag: `keep` for a drop, else a cancel. */
	const handleSensorEnd = useCallback(
		(keep: boolean) => {
			if (sensed.current !== null) sensed.current.live = false

			finishDrag(keep)
		},
		[finishDrag],
	)

	const handleDragEnd = useCallback(() => handleSensorEnd(true), [handleSensorEnd])

	const handleDragCancel = useCallback(() => handleSensorEnd(false), [handleSensorEnd])

	const cancelDrag = useCallback(() => {
		const drag = sensed.current

		if (drag !== null) {
			if (drag.attached) cancelSensor(drag)
			else drag.pending = true

			// A dnd-kit drag that outlives the cancel belongs to no gesture.
			drag.owned = false
		}

		finishDrag(false)
	}, [finishDrag])

	// One arrow press moves one column, or one row, of the traveling tile.
	const coordinateGetter = useCallback<KeyboardCoordinateGetter>(
		(event, { currentCoordinates }) => {
			const pitch = store.getState().gesture?.pitch ?? 0

			if (pitch <= 0) return undefined

			const step = { x: 0, y: 0 }

			if (event.code === 'ArrowRight') step.x = pitch
			else if (event.code === 'ArrowLeft') step.x = -pitch
			else if (event.code === 'ArrowDown') step.y = pitch / ROW_SUBDIVISION
			else if (event.code === 'ArrowUp') step.y = -pitch / ROW_SUBDIVISION
			else return undefined

			return { x: currentCoordinates.x + step.x, y: currentCoordinates.y + step.y }
		},
		[store],
	)

	const sensors = useSortableSensors({ keyboardCoordinateGetter: coordinateGetter })

	const announcements = useMemo<Announcements>(() => {
		const spoken = { last: '' }

		const say = (text: string) => {
			if (text === spoken.last) return undefined

			spoken.last = text

			return text
		}

		// A drag that the store does not own moves nothing, so it says nothing.
		const owns = (id: string) => sensed.current?.owned === true && sensed.current.id === id

		return {
			onDragStart: ({ active }) => {
				const id = String(active.id)

				if (!owns(id)) return undefined

				const cell = currentCell(store, id)

				spoken.last = ''

				return cell
					? say(describeDragStart(labelOf(store, id), cell, store.getState().columns))
					: undefined
			},
			onDragMove: ({ active }) => {
				const id = String(active.id)

				if (!owns(id)) return undefined

				const { gesture, columns } = store.getState()

				const cell = gesture?.preview?.find((item) => item.id === id) ?? null

				const partner = gesture?.partner ? labelOf(store, gesture.partner) : null

				return say(
					describeDragMove(labelOf(store, id), cell, columns, gesture?.change ?? null, partner),
				)
			},
			onDragOver: () => undefined,
			onDragEnd: ({ active }) => {
				const id = String(active.id)

				if (!owns(id)) return undefined

				const settled = store.getState().gesture?.kind === 'settle'

				const cell = settled ? currentCell(store, id) : (store.getView().cells.get(id) ?? null)

				if (cell === null) return undefined

				return describeDragEnd(labelOf(store, id), cell, store.getState().columns, settled)
			},
			onDragCancel: ({ active }) => {
				const id = String(active.id)

				if (!owns(id)) return undefined

				const cell = store.getView().cells.get(id)

				return cell
					? describeDragCancel(labelOf(store, id), cell, store.getState().columns)
					: undefined
			},
		}
	}, [store])

	const context = useMemo<DndContextProps>(
		() => ({
			sensors,
			accessibility: { announcements },
			onDragStart: handleDragStart,
			onDragMove: handleDragMove,
			onDragEnd: handleDragEnd,
			onDragCancel: handleDragCancel,
		}),
		[sensors, announcements, handleDragStart, handleDragMove, handleDragEnd, handleDragCancel],
	)

	return { context, cancelDrag }
}
