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
import {
	describeDragCancel,
	describeDragEnd,
	describeDragMove,
	describeDragStart,
} from './engine/dashboard-announcements'
import { dragPreview, dragTravel } from './engine/dashboard-drag'
import { type DashboardCell, inlineSign, ROW_SUBDIVISION } from './engine/dashboard-layout'
import type { DashboardStore } from './engine/dashboard-store'
import type { DashboardGestureEndEvent, DashboardGestureStartEvent } from './types'

/** Options for {@link useDashboardDrag}. @internal */
export type DashboardDragOptions = {
	/** The store of the dashboard. */
	store: DashboardStore
	/** The canvas element, which gives the column pitch at the start of a drag. */
	canvasRef: RefObject<HTMLElement | null>
	/** Commits the cells of a preview, and returns the saved layout. */
	commit: (cells: readonly DashboardCell[]) => DashboardGestureEndEvent['layout']
	/** Receives the start of each drag. */
	onDragStart?: (event: DashboardGestureStartEvent) => void
	/** Receives the end of each drag. */
	onDragEnd?: (event: DashboardGestureEndEvent) => void
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
 * The travelling tile decides the target, not the pointer. The target is the
 * start cell plus the pointer delta in grid units, rounded and clamped to the
 * travel range. Nothing re-simulates until the target changes by a whole unit.
 *
 * @returns The props for `DndContext`.
 * @internal
 */
export function useDashboardDrag({
	store,
	canvasRef,
	commit,
	onDragStart,
	onDragEnd,
}: DashboardDragOptions): DndContextProps {
	/** The last target, so a move inside one unit does nothing. */
	const targetRef = useRef<{ x: number; y: number } | null>(null)

	const callbacks = useRef({ commit, onDragStart, onDragEnd })

	callbacks.current = { commit, onDragStart, onDragEnd }

	const handleDragStart = useCallback(
		(event: DragStartEvent) => {
			const id = String(event.active.id)

			const view = store.getView()

			const state = store.getState()

			const width = canvasRef.current?.clientWidth ?? 0

			if (!view.editable || width <= 0) return

			targetRef.current = null

			store.setState({
				gesture: {
					kind: 'drag',
					id,
					snapshot: [...view.cells.values()],
					preview: null,
					change: null,
					partner: null,
					width: state.width,
					pitch: width / state.columns,
					inline: inlineSign(canvasRef.current && getComputedStyle(canvasRef.current).direction),
				},
			})

			callbacks.current.onDragStart?.({ id, layout: state.layout })
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

	const handleDragEnd = useCallback(() => {
		const { gesture, layout } = store.getState()

		if (gesture?.kind !== 'drag') return

		targetRef.current = null

		if (gesture.preview === null) {
			store.setState({ gesture: null })

			callbacks.current.onDragEnd?.({ id: gesture.id, canceled: true, layout })

			return
		}

		// The settle phase paints the preview, with the tile no longer pinned to its
		// start cell, until the committed layout arrives.
		store.setState({ gesture: { ...gesture, kind: 'settle' } })

		const next = callbacks.current.commit(gesture.preview)

		callbacks.current.onDragEnd?.({ id: gesture.id, canceled: false, layout: next })
	}, [store])

	const handleDragCancel = useCallback(() => {
		const { gesture, layout } = store.getState()

		if (gesture?.kind !== 'drag') return

		targetRef.current = null

		store.setState({ gesture: null })

		callbacks.current.onDragEnd?.({ id: gesture.id, canceled: true, layout })
	}, [store])

	// One arrow press moves one column, or one row, of the travelling tile.
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

		return {
			onDragStart: ({ active }) => {
				const id = String(active.id)

				const cell = currentCell(store, id)

				spoken.last = ''

				return cell
					? say(describeDragStart(labelOf(store, id), cell, store.getState().columns))
					: undefined
			},
			onDragMove: ({ active }) => {
				const id = String(active.id)

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

				const settled = store.getState().gesture?.kind === 'settle'

				const cell = settled ? currentCell(store, id) : (store.getView().cells.get(id) ?? null)

				if (cell === null) return undefined

				return describeDragEnd(labelOf(store, id), cell, store.getState().columns, settled)
			},
			onDragCancel: ({ active }) => {
				const id = String(active.id)

				const cell = store.getView().cells.get(id)

				return cell
					? describeDragCancel(labelOf(store, id), cell, store.getState().columns)
					: undefined
			},
		}
	}, [store])

	return useMemo<DndContextProps>(
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
}
