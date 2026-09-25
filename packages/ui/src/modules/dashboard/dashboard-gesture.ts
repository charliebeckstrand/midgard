'use client'

import { type DashboardCell, inlineSign } from './engine/dashboard-layout'
import type { DashboardStore, DashboardView } from './engine/dashboard-store'
import type { DashboardGestureEndEvent } from './types'

/** What {@link measureGesture} reads at the start of a gesture. @internal */
export type DashboardGestureMeasure = {
	/** The view at the start. */
	view: DashboardView
	/** The column pitch in px. */
	pitch: number
	/** The inline direction of the canvas: `1` for ltr, `-1` for rtl. */
	inline: 1 | -1
	/** The painted cells at the start. A cancel returns to them. */
	snapshot: DashboardCell[]
}

/** The callbacks of {@link endGesture}. @internal */
export type DashboardGestureEndCallbacks = {
	/** Commits the cells of a preview, and returns the saved layout. */
	commit: (cells: readonly DashboardCell[]) => DashboardGestureEndEvent['layout']
	/** Receives the end of the gesture. */
	onEnd?: (event: DashboardGestureEndEvent) => void
}

/**
 * Reads the board at the start of a drag or a resize: the column pitch, the
 * inline direction, and a snapshot of the painted cells. It returns `null` when
 * the board is not editable or the canvas has no width.
 *
 * @internal
 */
export function measureGesture(
	store: DashboardStore,
	canvas: HTMLElement | null,
): DashboardGestureMeasure | null {
	const view = store.getView()

	const width = canvas?.clientWidth ?? 0

	if (canvas === null || !view.editable || width <= 0) return null

	return {
		view,
		pitch: width / store.getState().columns,
		inline: inlineSign(getComputedStyle(canvas).direction),
		snapshot: [...view.cells.values()],
	}
}

/**
 * Ends the live drag or resize of the tile `id`. A kept preview enters the
 * settle phase and commits. A cancel, or a gesture that changed nothing,
 * returns to the snapshot. Either way, `onEnd` receives one end event.
 *
 * @internal
 */
export function endGesture(
	store: DashboardStore,
	id: string,
	keep: boolean,
	{ commit, onEnd }: DashboardGestureEndCallbacks,
): void {
	const { gesture, layout } = store.getState()

	const preview = gesture?.preview ?? null

	if (!keep || gesture === null || preview === null) {
		store.setState({ gesture: null })

		onEnd?.({ id, canceled: true, layout })

		return
	}

	// The settle phase paints the preview, with the tile no longer pinned to its
	// start cell, until the committed layout arrives.
	store.setState({ gesture: { ...gesture, kind: 'settle' } })

	const next = commit(preview)

	onEnd?.({ id, canceled: false, layout: next })
}
