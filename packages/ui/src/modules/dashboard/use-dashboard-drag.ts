'use client'

import type {
	Announcements,
	DndContextProps,
	DragMoveEvent,
	DragStartEvent,
	KeyboardCoordinateGetter,
} from '@dnd-kit/core'
import { type RefObject, useCallback, useId, useMemo, useRef } from 'react'
import { useSortableSensors } from '../../hooks'
import { useStableEvent } from '../../hooks/use-stable-event'
import { reorderMessages } from '../../primitives/intl/intl-reorder'
import type { IntlShape } from '../../primitives/intl/types'
import { useIntl } from '../../primitives/intl/use-intl'
import { clamp } from '../../utilities'
import { hasBrowserModifier } from '../../utilities/modifier-keys'
import { type DashboardCommit, endGesture, measureGesture, startGesture } from './dashboard-gesture'
import {
	type DashboardStackPlace,
	describeDragAtStart,
	describeDragCancel,
	describeDragEnd,
	describeDragMove,
	describeDragStart,
	describeStackCancel,
	describeStackEnd,
	describeStackMove,
	describeStackStart,
} from './engine/dashboard-announcements'
import {
	type DashboardOffset,
	dragPreview,
	stackPreview,
	travelOffset,
} from './engine/dashboard-drag'
import { type DashboardCell, ROW_SUBDIVISION, readingOrder } from './engine/dashboard-layout'
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
 * A drag in the re-pack, which reorders the tiles as a list. The centers come
 * from the layout box of each tile at the start, so a running glide does not
 * move them.
 */
type StackDrag = {
	/** The ids of the tiles in reading order at the start. */
	order: readonly string[]
	/** The center of each tile at the start, in px from the canvas. */
	centers: ReadonlyMap<string, DashboardOffset>
	/** The place in `order` that the preview shows. */
	index: number
	/** The place in `order` at the start. */
	start: number
}

/** The center of each tile on the canvas, from its layout box. */
function tileCenters(canvas: HTMLElement): Map<string, DashboardOffset> {
	const centers = new Map<string, DashboardOffset>()

	for (const tile of canvas.querySelectorAll<HTMLElement>(':scope > [data-tile-id]')) {
		const id = tile.dataset.tileId

		if (id === undefined) continue

		centers.set(id, {
			x: tile.offsetLeft + tile.offsetWidth / 2,
			y: tile.offsetTop + tile.offsetHeight / 2,
		})
	}

	return centers
}

/**
 * The place in `order` of the tile whose start center is nearest to `point`. The
 * dragged tile counts at its own start center, so a short travel keeps its place.
 */
function nearestPlace(stack: StackDrag, point: DashboardOffset): number {
	let best = stack.start

	let distance = Number.POSITIVE_INFINITY

	stack.order.forEach((id, index) => {
		const center = stack.centers.get(id)

		if (center === undefined) return

		const d = (center.x - point.x) ** 2 + (center.y - point.y) ** 2

		if (d < distance) {
			best = index

			distance = d
		}
	})

	return best
}

/**
 * The step of one arrow press in the re-pack: one place forward or back in
 * reading order. The inline arrows follow the direction of the canvas.
 *
 * @returns The step, or null for a key that does not move the tile.
 */
function stackStep(event: KeyboardEvent, inline: 1 | -1): number | null {
	if (hasBrowserModifier(event)) return null

	switch (event.code) {
		case 'ArrowDown':
			return 1
		case 'ArrowUp':
			return -1
		case 'ArrowRight':
			return inline
		case 'ArrowLeft':
			return -inline
		default:
			return null
	}
}

/**
 * Previews the target cell that the pointer travel `delta` reaches on the saved
 * layout. `target` holds the last target, so a move inside one unit does nothing.
 */
function moveOnGrid(
	store: DashboardStore,
	delta: DashboardOffset,
	target: { current: { x: number; y: number } | null },
): void {
	const { gesture, columns } = store.getState()

	if (gesture?.kind !== 'drag') return

	// The view paints the dragged tile at its start cell, and it holds the travel range.
	const { cells, travel } = store.getView()

	const origin = cells.get(gesture.id)

	if (origin === undefined || travel === null) return

	const { pitch, inline } = gesture

	const offset = travelOffset(origin, delta, travel, pitch, inline)

	// In a right-to-left board a travel to the right moves toward column 0.
	const x = Math.round(origin.x + (inline * offset.x) / pitch)

	const y = Math.round(origin.y + (offset.y * ROW_SUBDIVISION) / pitch)

	const prev = target.current

	if (prev !== null && prev.x === x && prev.y === y) return

	target.current = { x, y }

	const preview = dragPreview(gesture.snapshot, gesture.id, x, y, columns)

	// A step from no change to no change changes nothing that a reader sees.
	if (preview === null && gesture.preview === null) return

	store.setState({
		gesture: {
			...gesture,
			preview: preview?.cells ?? null,
			change: preview?.kind ?? null,
			partner: preview?.partner ?? null,
		},
	})
}

/** Starts a drag in the re-pack of the tile `id`. */
function startStack(
	snapshot: readonly DashboardCell[],
	id: string,
	canvas: HTMLElement,
): StackDrag {
	const order = readingOrder(snapshot)

	const start = order.indexOf(id)

	return { order, centers: tileCenters(canvas), index: start, start }
}

/** Previews the place in the re-pack that the pointer travel `delta` reaches. */
function moveInStack(store: DashboardStore, stack: StackDrag, delta: DashboardOffset): void {
	const { gesture, columns } = store.getState()

	const center = gesture === null ? undefined : stack.centers.get(gesture.id)

	if (gesture?.kind !== 'drag' || center === undefined) return

	const index = nearestPlace(stack, { x: center.x + delta.x, y: center.y + delta.y })

	if (index === stack.index) return

	stack.index = index

	const preview = stackPreview(gesture.snapshot, gesture.id, index, columns)

	// A step from no change to no change changes nothing that a reader sees.
	if (preview === null && gesture.preview === null) return

	store.setState({ gesture: { ...gesture, preview, change: preview && 'move', partner: null } })
}

/**
 * The coordinates of one arrow press in the re-pack: the travel that puts the
 * center of the dragged tile on the start center of the tile one place away.
 *
 * @returns The coordinates, or undefined for a key that does not move the tile.
 */
function stackCoordinates(
	stack: StackDrag,
	event: KeyboardEvent,
	id: string,
	inline: 1 | -1,
	current: DashboardOffset,
	delta: DashboardOffset,
): DashboardOffset | undefined {
	const step = stackStep(event, inline)

	if (step === null) return undefined

	const from = stack.centers.get(id)

	const target = stack.order[clamp(stack.index + step, 0, stack.order.length - 1)]

	const to = target === undefined ? undefined : stack.centers.get(target)

	if (from === undefined || to === undefined) return current

	return { x: current.x + to.x - from.x - delta.x, y: current.y + to.y - from.y - delta.y }
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

/**
 * The move of one arrow press on a traveling tile: one column of `pitch` px across, or one
 * row down or up. A key with Ctrl, Meta, or Alt is for the browser, so it moves nothing.
 *
 * @returns The move in px, or null for a key that does not move the tile.
 */
function arrowStep(event: KeyboardEvent, pitch: number): { x: number; y: number } | null {
	if (hasBrowserModifier(event)) return null

	switch (event.code) {
		case 'ArrowRight':
			return { x: pitch, y: 0 }
		case 'ArrowLeft':
			return { x: -pitch, y: 0 }
		case 'ArrowDown':
			return { x: 0, y: pitch / ROW_SUBDIVISION }
		case 'ArrowUp':
			return { x: 0, y: -pitch / ROW_SUBDIVISION }
		default:
			return null
	}
}

/** Whether the store gesture owns the last drag that dnd-kit started, of the tile `id`. */
function ownsDrag(drag: SensedDrag | null, id: string): boolean {
	return drag?.owned === true && drag.id === id
}

/** The name that the live region reads for a tile. */
function getLabel(store: DashboardStore, id: string): string {
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
 * In the re-pack, a drag reorders the tiles as a list ({@link stackPreview}).
 * The target is the place of the tile whose start center is nearest to the
 * center of the traveling tile, and an arrow press moves one place.
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
	const intl = useIntl()

	/** The last target, so a move inside one unit does nothing. */
	const targetRef = useRef<{ x: number; y: number } | null>(null)

	/** The last raw delta of the live drag, before the clamp to the travel range. */
	const deltaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

	// The handlers read the newest callbacks, and they keep their identity.
	const commitCells = useStableEvent(commit)

	const reportDragStart = useStableEvent((event: DashboardGestureStartEvent) =>
		onDragStart?.(event),
	)

	const reportDragEnd = useStableEvent((event: DashboardGestureEndEvent) => onDragEnd?.(event))

	// The announcements read it after the end of the drag, so it stays until the next start.
	const sensed = useRef<SensedDrag | null>(null)

	// The drag in the re-pack, or `null` for a drag on the saved layout. It stays until the next start.
	const stackRef = useRef<StackDrag | null>(null)

	const handleDragStart = useCallback(
		(event: DragStartEvent) => {
			const id = String(event.active.id)

			const canvas = canvasRef.current

			const measure = measureGesture(store, 'drag', canvas)

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

			stackRef.current = null

			if (measure === null || canvas === null) return

			targetRef.current = null

			deltaRef.current = { x: 0, y: 0 }

			if (measure.view.projected) stackRef.current = startStack(measure.snapshot, id, canvas)

			startGesture(store, 'drag', id, measure, reportDragStart)
		},
		[store, canvasRef, reportDragStart],
	)

	const handleDragMove = useCallback(
		(event: DragMoveEvent) => {
			const gesture = store.getState().gesture

			if (gesture?.kind !== 'drag' || gesture.pitch <= 0) return

			// The keyboard steps from this delta, so it records each move, also inside one unit.
			deltaRef.current = event.delta

			const stack = stackRef.current

			if (stack === null) moveOnGrid(store, event.delta, targetRef)
			else moveInStack(store, stack, event.delta)
		},
		[store],
	)

	/** Ends the live drag: `keep` commits its preview, else it returns to the snapshot. */
	const finishDrag = useCallback(
		(keep: boolean) => {
			const gesture = store.getState().gesture

			if (gesture?.kind !== 'drag') return

			targetRef.current = null

			deltaRef.current = { x: 0, y: 0 }

			endGesture(store, gesture.id, keep, {
				commit: commitCells,
				onEnd: reportDragEnd,
			})
		},
		[store, reportDragEnd, commitCells],
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

	// One arrow press moves one column, or one row, of the traveling tile. Each press starts
	// from the position inside the travel range, so a press past an edge leaves no overshoot,
	// and the next opposite press moves the tile at once. The pointer keeps its overshoot.
	// In the re-pack, one arrow press moves one place.
	const coordinateGetter = useCallback<KeyboardCoordinateGetter>(
		(event, { currentCoordinates }) => {
			const gesture = store.getState().gesture

			const pitch = gesture?.pitch ?? 0

			if (gesture === null || pitch <= 0) return undefined

			const stack = stackRef.current

			if (stack !== null) {
				return stackCoordinates(
					stack,
					event,
					gesture.id,
					gesture.inline,
					currentCoordinates,
					deltaRef.current,
				)
			}

			const step = arrowStep(event, pitch)

			if (step === null) return undefined

			const { cells, travel } = store.getView()

			const origin = cells.get(gesture.id)

			const delta = deltaRef.current

			const clamped =
				origin === undefined || travel === null
					? delta
					: travelOffset(origin, delta, travel, pitch, gesture.inline)

			return {
				x: currentCoordinates.x + clamped.x - delta.x + step.x,
				y: currentCoordinates.y + clamped.y - delta.y + step.y,
			}
		},
		[store],
	)

	const sensors = useSortableSensors({ keyboardCoordinateGetter: coordinateGetter })

	// An id from `useId`, so the server and the browser agree on the id of the
	// drag description. dnd-kit makes it from a shared counter without one.
	const id = useId()

	// The live region of dnd-kit writes a text only when it changes, so a repeated
	// sentence is not spoken again.
	const gridAnnouncements = useMemo<Announcements>(() => {
		// A drag that the store does not own moves nothing, so it says nothing.
		const owns = (id: string) => ownsDrag(sensed.current, id)

		return {
			onDragStart: ({ active }) => {
				const id = String(active.id)

				if (!owns(id)) return undefined

				const cell = currentCell(store, id)

				return cell
					? describeDragStart(intl, getLabel(store, id), cell, store.getState().columns)
					: undefined
			},
			onDragMove: ({ active }) => {
				const id = String(active.id)

				if (!owns(id)) return undefined

				const { gesture, columns } = store.getState()

				const start = gesture?.snapshot.find((item) => item.id === id)

				const target = targetRef.current

				// A target at the start cell has no preview, as a blocked target has. But the tile can go there.
				if (start !== undefined && target?.x === start.x && target.y === start.y) {
					return describeDragAtStart(intl, getLabel(store, id), start, columns)
				}

				const cell = gesture?.preview?.find((item) => item.id === id) ?? null

				const partner = gesture?.partner ? getLabel(store, gesture.partner) : null

				return describeDragMove(
					intl,
					getLabel(store, id),
					cell,
					columns,
					gesture?.change ?? null,
					partner,
				)
			},
			onDragOver: () => undefined,
			onDragEnd: ({ active }) => {
				const id = String(active.id)

				if (!owns(id)) return undefined

				const settled = store.getState().gesture?.kind === 'settle'

				const cell = settled ? currentCell(store, id) : (store.getView().cells.get(id) ?? null)

				if (cell === null) return undefined

				return describeDragEnd(intl, getLabel(store, id), cell, store.getState().columns, settled)
			},
			onDragCancel: ({ active }) => {
				const id = String(active.id)

				if (!owns(id)) return undefined

				const cell = store.getView().cells.get(id)

				return cell
					? describeDragCancel(intl, getLabel(store, id), cell, store.getState().columns)
					: undefined
			},
		}
	}, [store, intl])

	// A drag in the re-pack names the place of the tile in reading order.
	const stackAnnouncements = useMemo<Announcements>(() => {
		const say = (
			id: string,
			describe: (intl: IntlShape, label: string, place: DashboardStackPlace) => string,
			at: (stack: StackDrag) => number,
		) => {
			const stack = stackRef.current

			if (stack === null || !ownsDrag(sensed.current, id)) return undefined

			return describe(intl, getLabel(store, id), {
				position: at(stack) + 1,
				total: stack.order.length,
			})
		}

		return {
			onDragStart: ({ active }) => say(String(active.id), describeStackStart, (s) => s.start),
			onDragMove: ({ active }) => say(String(active.id), describeStackMove, (s) => s.index),
			onDragOver: () => undefined,
			// A drop that commits ends in the settle phase, at the place of the preview.
			onDragEnd: ({ active }) =>
				say(String(active.id), describeStackEnd, (s) =>
					store.getState().gesture?.kind === 'settle' ? s.index : s.start,
				),
			onDragCancel: ({ active }) => say(String(active.id), describeStackCancel, (s) => s.start),
		}
	}, [store, intl])

	const announcements = useMemo<Announcements>(() => {
		const pick = () => (stackRef.current === null ? gridAnnouncements : stackAnnouncements)

		return {
			onDragStart: (event) => pick().onDragStart(event),
			onDragMove: (event) => pick().onDragMove?.(event),
			onDragOver: (event) => pick().onDragOver(event),
			onDragEnd: (event) => pick().onDragEnd(event),
			onDragCancel: (event) => pick().onDragCancel(event),
		}
	}, [gridAnnouncements, stackAnnouncements])

	// The keyboard sensor of dnd-kit drops with Space and cancels with Escape.
	const accessibility = useMemo(
		() => ({
			announcements,
			screenReaderInstructions: {
				draggable: intl.formatMessage(reorderMessages.sensorInstructions),
			},
		}),
		[announcements, intl],
	)

	const context = useMemo<DndContextProps>(
		() => ({
			id,
			sensors,
			accessibility,
			onDragStart: handleDragStart,
			onDragMove: handleDragMove,
			onDragEnd: handleDragEnd,
			onDragCancel: handleDragCancel,
		}),
		[id, sensors, accessibility, handleDragStart, handleDragMove, handleDragEnd, handleDragCancel],
	)

	return { context, cancelDrag }
}
