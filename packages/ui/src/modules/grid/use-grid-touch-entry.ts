'use client'

import { type PointerEvent, type TouchEvent, useMemo, useRef } from 'react'
import { flushSync } from 'react-dom'
import { useStableEvent } from '../../hooks/use-stable-event'
import { useTouchTap } from '../../hooks/use-touch-tap'
import type { Coord } from './use-grid-navigation'

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
 * Opens the editor of the active cell on a tap of a finger. It is the touch
 * peer of the double-click, which a touch screen does not send: the root
 * `touch-action: manipulation` of `ui` stops the double-tap on iOS.
 *
 * The first tap on a cell moves the cursor to it, through the mouse events
 * that the browser makes from the tap. A tap on the cell that holds the cursor
 * opens that cell. The press records whether the cell held the cursor as the
 * finger came down, and the lift opens it. Thus the tap that moves the cursor
 * never opens the cell, and no time limit joins two taps.
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
 * @param isActive - Whether the cursor is on the cell at `coord` now.
 * @param enter - Opens the cell at `coord`. The caller gates a cell that cannot
 * edit.
 * @returns The handlers, with one identity for the mount.
 *
 * @internal
 */
export function useGridTouchEntry(
	isActive: (coord: Coord) => boolean,
	enter: (coord: Coord) => void,
): GridTouchEntry {
	// The cell of the press, when it held the cursor as the finger came down.
	const pressed = useRef<Coord | null>(null)

	// Whether the last tap opened a cell, so its touch end cancels the click.
	const opened = useRef(false)

	const open = useStableEvent(enter)

	const touch = useTouchTap(() => {
		const coord = pressed.current

		pressed.current = null

		if (coord === null) return

		opened.current = true

		flushSync(() => open(coord))
	})

	const down = useStableEvent((coord: Coord | null, event: PointerEvent<Element>) => {
		opened.current = false

		pressed.current =
			coord !== null && event.pointerType === 'touch' && isActive(coord) ? coord : null

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
