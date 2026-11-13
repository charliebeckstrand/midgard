'use client'

import { type MouseEvent, type PointerEvent, useLayoutEffect, useRef } from 'react'
import { MULTI_TAP_WINDOW } from '../../hooks/use-touch-tap'

/** The capture handlers that {@link useOverlayTapRun} gives to the root of an overlay. @internal */
export type OverlayTapRun = {
	onPointerDownCapture: (event: PointerEvent<Element>) => void
	onClickCapture: (event: MouseEvent<Element>) => void
}

/**
 * Stops the rest of the tap run that opened an overlay. A double tap on a
 * control that opens an overlay on one tap opens the overlay on the first tap.
 * The second tap then lands on the overlay. On the backdrop it closes the
 * overlay at once, and in the panel it can press a control that the reader
 * has not seen.
 *
 * A touch press that starts in {@link MULTI_TAP_WINDOW} of the open can be the
 * second tap of a double tap, so the overlay stops its click. The backdrop
 * closes on a click, and a control in the panel acts on a click. After the
 * window, the run is over, and each press acts. Nothing waits: the tap that
 * opens the overlay acts at once, and so does each press after the window. A
 * pinch or a drag in the window makes no click, so it acts. A mouse, a pen,
 * and the keyboard do not change.
 *
 * @remarks The window starts at the commit of the open, which comes after the
 * lift of the tap that opened the overlay. It thus holds a little longer than
 * the run.
 *
 * @param open - Whether the overlay is open.
 * @returns The capture handlers for the root of the overlay.
 * @internal
 */
export function useOverlayTapRun(open: boolean): OverlayTapRun {
	// The time of the commit of the open, on the clock of `event.timeStamp`.
	const openedAtRef = useRef(Number.NEGATIVE_INFINITY)

	// Whether the overlay stops the click of the current press.
	const stoppingRef = useRef(false)

	useLayoutEffect(() => {
		if (!open) return

		openedAtRef.current = performance.now()

		stoppingRef.current = false
	}, [open])

	return {
		onPointerDownCapture: (event) => {
			stoppingRef.current =
				event.pointerType === 'touch' && event.timeStamp - openedAtRef.current < MULTI_TAP_WINDOW
		},
		onClickCapture: (event) => {
			// A click from a key or a script has no press (`detail` 0), so it acts.
			if (!stoppingRef.current || event.detail === 0) return

			// The click is the last event of the press.
			stoppingRef.current = false

			event.preventDefault()

			event.stopPropagation()
		},
	}
}
