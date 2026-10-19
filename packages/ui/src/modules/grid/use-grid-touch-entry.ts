'use client'

import { type PointerEvent, type TouchEvent, useMemo, useRef } from 'react'
import { flushSync } from 'react-dom'
import { useStableEvent } from '../../hooks/use-stable-event'
import { useTouchTap } from '../../hooks/use-touch-tap'
import type { Coord } from './use-grid-navigation'

/**
 * Time, in ms, from the lift of one tap to the lift of the next, in which two
 * taps on one cell are a double tap. It is the window of the double tap of the
 * map.
 *
 * @internal
 */
export const GRID_DOUBLE_TAP_WINDOW = 400

/** A tap on a cell: where and when it lifted. @internal */
type CellTap = { coord: Coord; at: number }

/**
 * The touch handlers of the editable cells of a grid. Each handler keeps one
 * identity for the mount.
 *
 * @internal
 */
export type GridTouchEntry = {
	/**
	 * Starts a press. A cell gives its own place, or `null` for a press on
	 * content that keeps its own press, such as an open editor.
	 */
	onPointerDown: (coord: Coord | null, event: PointerEvent<Element>) => void
	onPointerMove: (event: PointerEvent<Element>) => void
	onPointerUp: (event: PointerEvent<Element>) => void
	onPointerCancel: () => void
	onTouchEnd: (event: TouchEvent<Element>) => void
}

/**
 * Opens the editor of a cell on a double tap of a finger. It is the touch peer
 * of the double-click, which a touch screen does not send: the root
 * `touch-action: manipulation` of `ui` stops the double-tap on iOS.
 *
 * One tap on a cell moves the cursor to it, through the mouse events that the
 * browser makes from the tap, and opens nothing. That is true also for a tap
 * on the cell that holds the cursor. A second tap on the same cell that lifts
 * in {@link GRID_DOUBLE_TAP_WINDOW} of the first opens the cell. A third tap
 * starts a new pair.
 *
 * {@link useTouchTap} finds the tap. A press that travels more than its
 * slop is a scroll, and a press that the browser cancels is a scroll that the
 * browser took. A press that holds past its window is a hold. None of them
 * opens the cell. A mouse and a pen do nothing here, so the double-click stays
 * their entry.
 *
 * The open runs in `flushSync`, so the editor mounts and takes focus before the
 * handler of the lift returns. iOS shows the keyboard only for a focus that a
 * handler of a user gesture moves. The touch end of an opening tap cancels the
 * mouse events and the click that the browser makes from the tap. Without it,
 * the mouse press can take focus from the editor back to the grid.
 *
 * @param enter - Opens the cell at `coord`. The caller gates a cell that cannot
 * edit.
 * @returns The handlers, with one identity for the mount.
 *
 * @internal
 */
export function useGridTouchEntry(enter: (coord: Coord) => void): GridTouchEntry {
	// The cell of the touch press.
	const pressed = useRef<Coord | null>(null)

	// The last tap, which the next tap on its cell makes a double tap.
	const prevTap = useRef<CellTap | null>(null)

	// Whether the last tap opened a cell, so its touch end cancels the click.
	const opened = useRef(false)

	const open = useStableEvent(enter)

	const touch = useTouchTap(() => {
		const coord = pressed.current

		pressed.current = null

		if (coord === null) {
			prevTap.current = null

			return
		}

		const at = performance.now()

		const prev = prevTap.current

		const double =
			prev !== null &&
			prev.coord.row === coord.row &&
			prev.coord.col === coord.col &&
			at - prev.at <= GRID_DOUBLE_TAP_WINDOW

		if (!double) {
			prevTap.current = { coord, at }

			return
		}

		prevTap.current = null

		opened.current = true

		flushSync(() => open(coord))
	})

	const down = useStableEvent((coord: Coord | null, event: PointerEvent<Element>) => {
		opened.current = false

		pressed.current = event.pointerType === 'touch' ? coord : null

		touch.onPointerDown(event)
	})

	const move = useStableEvent((event: PointerEvent<Element>) => touch.onPointerMove(event))

	const up = useStableEvent((event: PointerEvent<Element>) => {
		touch.onPointerUp(event)

		pressed.current = null
	})

	const cancel = useStableEvent(() => {
		touch.onPointerCancel()

		pressed.current = null
	})

	const end = useStableEvent((event: TouchEvent<Element>) => {
		if (!opened.current) return

		opened.current = false

		touch.onTouchEnd(event)
	})

	return useMemo(
		() => ({
			onPointerDown: down,
			onPointerMove: move,
			onPointerUp: up,
			onPointerCancel: cancel,
			onTouchEnd: end,
		}),
		[down, move, up, cancel, end],
	)
}
