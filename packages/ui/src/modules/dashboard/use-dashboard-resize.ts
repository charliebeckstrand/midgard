'use client'

import { type PointerEvent as ReactPointerEvent, type RefObject, useCallback, useRef } from 'react'
import { type DragCursor, holdDragCursor } from '../../hooks/use-drag-cursor'
import { type DashboardCommit, endGesture, measureGesture } from './dashboard-gesture'
import { type DashboardCell, ROW_SUBDIVISION } from './engine/dashboard-layout'
import {
	type DashboardResizeEdge,
	drivesHeight,
	drivesWidth,
	resizeFloor,
	resizeLimits,
	resizePreview,
	samePreview,
} from './engine/dashboard-resize'
import type { DashboardStore } from './engine/dashboard-store'
import type { DashboardGestureEndEvent, DashboardGestureStartEvent } from './types'

/** Options for {@link useDashboardResize}. @internal */
export type DashboardResizeOptions = {
	/** The store of the dashboard. */
	store: DashboardStore
	/** The canvas element, which gives the column pitch. */
	canvasRef: RefObject<HTMLElement | null>
	/** Commits the cells of a preview, and returns what the commit leaves. */
	commit: (cells: readonly DashboardCell[]) => DashboardCommit
	/** Receives the start of each pointer resize. */
	onResizeStart?: (event: DashboardGestureStartEvent) => void
	/** Receives the end of each pointer resize. */
	onResizeEnd?: (event: DashboardGestureEndEvent) => void
}

/** What {@link useDashboardResize} returns. @internal */
export type DashboardResizeHandlers = {
	/** Starts a pointer resize from the `pointerdown` of a handle. */
	beginResize: (
		id: string,
		edge: DashboardResizeEdge,
		event: ReactPointerEvent<HTMLElement>,
	) => void
	/** Applies one keyboard step, and commits it at once. */
	resizeBy: (id: string, edge: DashboardResizeEdge, dw: number, dh: number) => void
	/**
	 * Ends the live pointer resize as canceled, and detaches its listeners. With an
	 * `id`, it ends only a resize of that tile. It does nothing when no such resize
	 * is live.
	 */
	cancelResize: (id?: string) => void
}

/**
 * The cursor that one resize holds: the cursor of its splitter at rest. The corner
 * sits at the end edge, so a right-to-left tile slants the cursor the other way.
 */
function edgeCursor(edge: DashboardResizeEdge, inline: 1 | -1): DragCursor {
	if (edge === 'e') return 'ew-resize'

	if (edge === 's') return 'ns-resize'

	return inline === 1 ? 'nwse-resize' : 'nesw-resize'
}

/** The pitch and the limits of one resize of the tile `id`, or `null` when the tile cannot resize. */
function resizeContext(store: DashboardStore, canvas: HTMLElement | null, id: string) {
	const measure = measureGesture(store, canvas)

	const origin = measure?.view.cells.get(id)

	if (measure === null || origin === undefined || origin.static) return null

	const { pitch, inline, snapshot } = measure

	const { columns, gap, demands } = store.getState()

	const demand = demands.get(id)

	const limits = resizeLimits(demand, columns, resizeFloor(demand, { columns, gap, pitch }))

	return { origin, pitch, inline, snapshot, limits }
}

/**
 * The resize gestures of the dashboard: a pointer drag on a splitter, and one
 * arrow-key step on a focused splitter. The pure {@link resizePreview} decides
 * each preview, so a tile grows until it meets a neighbor or an edge. A pointer
 * drag counts its travel in the canvas, so a scroll during the drag keeps the
 * edge under the pointer. The canvas does not get shorter during the drag, so a
 * shrink never clamps a scroll into more travel.
 *
 * @internal
 */
export function useDashboardResize({
	store,
	canvasRef,
	commit,
	onResizeStart,
	onResizeEnd,
}: DashboardResizeOptions): DashboardResizeHandlers {
	const callbacks = useRef({ commit, onResizeStart, onResizeEnd })

	callbacks.current = { commit, onResizeStart, onResizeEnd }

	// The tile and the end of the live pointer resize. A splitter that unmounts
	// takes its own listeners away, so the board ends the gesture through this ref.
	const live = useRef<{ id: string; finish: (keep: boolean) => void } | null>(null)

	const beginResize = useCallback(
		(id: string, edge: DashboardResizeEdge, event: ReactPointerEvent<HTMLElement>) => {
			if (event.button !== 0) return

			const canvas = canvasRef.current

			const context = resizeContext(store, canvas, id)

			if (canvas === null || context === null) return

			event.preventDefault()

			const { origin, pitch, inline, snapshot, limits } = context

			const handle = event.currentTarget

			const pointerId = event.pointerId

			// The travel counts in the canvas and not in the viewport. A scroll during the
			// gesture moves the content under the pointer, so the edge moves with the content.
			const inCanvas = (x: number, y: number) => {
				const box = canvas.getBoundingClientRect()

				return { x: x - box.left, y: y - box.top }
			}

			const start = inCanvas(event.clientX, event.clientY)

			// The canvas does not get shorter during the gesture. At the end of a scroll box, a
			// shorter canvas makes the browser clamp the scroll. The scroll listener then reads
			// the clamp as travel, and a still pointer shrinks the tile again on each frame.
			const restMinHeight = canvas.style.minHeight

			let held = 0

			// The hold only rises: each read takes the height that the last preview painted. The
			// read is in layout px, as the min-height is. A client rect has the zoom and the
			// transforms of the ancestors, so a hold from it grows the canvas on each read.
			const holdHeight = () => {
				const height = Number.parseFloat(getComputedStyle(canvas).height)

				if (height <= held) return

				held = height

				canvas.style.minHeight = `${height}px`
			}

			holdHeight()

			// The last pointer point in the viewport. A scroll reads it again against the canvas.
			let pointer = { x: event.clientX, y: event.clientY }

			handle.setPointerCapture(pointerId)

			// The cursor of the edge stays on the page until `finish`, over the tiles
			// and the controls that the pointer crosses.
			const releaseCursor = holdDragCursor(edgeCursor(edge, inline))

			const { width, layout } = store.getState()

			store.setState({
				gesture: {
					kind: 'resize',
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

			callbacks.current.onResizeStart?.({ id, layout })

			const update = () => {
				const gesture = store.getState().gesture

				if (gesture?.kind !== 'resize') return

				holdHeight()

				const { x, y } = inCanvas(pointer.x, pointer.y)

				// The end edge of a right-to-left tile is its left edge, so a travel to the left grows it.
				const dw = drivesWidth(edge) ? (inline * (x - start.x)) / pitch : 0

				const dh = drivesHeight(edge, limits.ratio) ? ((y - start.y) * ROW_SUBDIVISION) / pitch : 0

				const preview = resizePreview(snapshot, id, origin.w + dw, origin.h + dh, limits)

				if (samePreview(preview, gesture.preview)) return

				store.setState({ gesture: { ...gesture, preview } })
			}

			const move = (moveEvent: PointerEvent) => {
				pointer = { x: moveEvent.clientX, y: moveEvent.clientY }

				update()
			}

			// One signal detaches each listener that the gesture added.
			const listening = new AbortController()

			const finish = (keep: boolean) => {
				if (listening.signal.aborted) return

				listening.abort()

				// No listener is left, so a clamp that the release causes moves no edge.
				canvas.style.minHeight = restMinHeight

				live.current = null

				releaseCursor()

				if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId)

				endGesture(store, id, keep, {
					commit: callbacks.current.commit,
					onEnd: callbacks.current.onResizeEnd,
				})
			}

			const onKey = (keyEvent: KeyboardEvent) => {
				if (keyEvent.key !== 'Escape') return

				keyEvent.preventDefault()

				keyEvent.stopPropagation()

				finish(false)
			}

			const { signal } = listening

			handle.addEventListener('pointermove', move, { signal })

			handle.addEventListener('pointerup', () => finish(true), { signal })

			handle.addEventListener('pointercancel', () => finish(false), { signal })

			handle.addEventListener('lostpointercapture', () => finish(false), { signal })

			window.addEventListener('keydown', onKey, { capture: true, signal })

			// A scroll event does not bubble, so the capture phase on the window reads each scroll box.
			window.addEventListener('scroll', update, { capture: true, passive: true, signal })

			live.current = { id, finish }
		},
		[store, canvasRef],
	)

	const cancelResize = useCallback((id?: string) => {
		const resize = live.current

		if (resize !== null && (id === undefined || resize.id === id)) resize.finish(false)
	}, [])

	const resizeBy = useCallback(
		(id: string, edge: DashboardResizeEdge, dw: number, dh: number) => {
			const context = resizeContext(store, canvasRef.current, id)

			if (context === null) return

			const { origin, inline, snapshot, limits } = context

			// The arrow keys follow the screen: in a right-to-left tile the end edge is on the left.
			const w = drivesWidth(edge) ? origin.w + inline * dw : origin.w

			const h = drivesHeight(edge, limits.ratio) ? origin.h + dh : origin.h

			const preview = resizePreview(snapshot, id, w, h, limits)

			if (preview === null) return

			const { failure } = callbacks.current.commit(preview)

			if (failure !== undefined) throw failure.error
		},
		[store, canvasRef],
	)

	return { beginResize, resizeBy, cancelResize }
}
