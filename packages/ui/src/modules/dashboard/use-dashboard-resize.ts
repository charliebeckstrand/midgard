'use client'

import { type PointerEvent as ReactPointerEvent, type RefObject, useCallback, useRef } from 'react'
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
 * each preview, so a tile grows until it meets a neighbor or an edge.
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

			const context = resizeContext(store, canvasRef.current, id)

			if (context === null) return

			event.preventDefault()

			const { origin, pitch, inline, snapshot, limits } = context

			const handle = event.currentTarget

			const pointerId = event.pointerId

			const start = { x: event.clientX, y: event.clientY }

			handle.setPointerCapture(pointerId)

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

			const move = (moveEvent: PointerEvent) => {
				const gesture = store.getState().gesture

				if (gesture?.kind !== 'resize') return

				// The end edge of a right-to-left tile is its left edge, so a travel to the left grows it.
				const dw = drivesWidth(edge) ? (inline * (moveEvent.clientX - start.x)) / pitch : 0

				const dh = drivesHeight(edge, limits.ratio)
					? ((moveEvent.clientY - start.y) * ROW_SUBDIVISION) / pitch
					: 0

				const preview = resizePreview(snapshot, id, origin.w + dw, origin.h + dh, limits)

				if (samePreview(preview, gesture.preview)) return

				store.setState({ gesture: { ...gesture, preview } })
			}

			// One signal detaches each listener that the gesture added.
			const listening = new AbortController()

			const finish = (keep: boolean) => {
				if (listening.signal.aborted) return

				listening.abort()

				live.current = null

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
