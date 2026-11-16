'use client'

import { type MouseEvent, type PointerEvent, useLayoutEffect, useRef } from 'react'
import { MULTI_TAP_DISTANCE, MULTI_TAP_WINDOW } from '../../hooks/use-touch-tap'

/** The capture handlers that {@link useOverlayAbsorb} gives to the root of an overlay. @internal */
export type OverlayAbsorb = {
	onPointerDownCapture: (event: PointerEvent<Element>) => void
	onMouseDownCapture: (event: MouseEvent<Element>) => void
	onClickCapture: (event: MouseEvent<Element>) => void
	onDoubleClickCapture: (event: MouseEvent<Element>) => void
}

/** Where and when a finger last lifted, on the clock of `event.timeStamp`. */
type Lift = { x: number; y: number; at: number }

let lastLift: Lift | null = null

function recordLift(event: globalThis.PointerEvent) {
	if (event.pointerType !== 'touch' || !event.isPrimary) return

	lastLift = { x: event.clientX, y: event.clientY, at: event.timeStamp }
}

/**
 * Records each lift of a finger on the page. The tap that opens an overlay
 * lifts before the overlay mounts, so the listener attaches once, when the
 * module loads, and stays for the life of the page. It listens in the capture
 * phase, so a handler that stops the lift does not hide it.
 */
function watchFingerLifts() {
	if (typeof window === 'undefined') return

	window.addEventListener('pointerup', recordLift, { capture: true, passive: true })
}

watchFingerLifts()

/**
 * Whether a touch press continues the run of `lift`: it starts in
 * {@link MULTI_TAP_WINDOW} of that lift, and in {@link MULTI_TAP_DISTANCE} of
 * its point. `useTouchTap` joins two taps into a double tap with the same rule.
 */
function continuesRun(event: PointerEvent<Element>, lift: Lift | null): boolean {
	if (event.pointerType !== 'touch' || lift === null) return false

	return (
		event.timeStamp - lift.at <= MULTI_TAP_WINDOW &&
		Math.hypot(event.clientX - lift.x, event.clientY - lift.y) <= MULTI_TAP_DISTANCE
	)
}

/**
 * Absorbs the second tap of the double tap that opened an overlay. A double
 * tap on a control that opens an overlay on one tap opens the overlay on the
 * first tap. The second tap then lands on the overlay. On the backdrop it closes the
 * overlay at once, and in the panel it can press a control that the reader
 * has not seen.
 *
 * A touch press that continues the run of the tap that opened the overlay is
 * the second tap of a double tap. It starts in {@link MULTI_TAP_WINDOW} of the
 * lift of that tap, and in {@link MULTI_TAP_DISTANCE} of its point. The overlay
 * stops the `mousedown`, the click, and the `dblclick` of that press. The
 * backdrop closes on a click, and a control in the panel acts on a click or a
 * `dblclick`. The default action of `mousedown` moves the focus, so without
 * the stop the tap moves the focus out of the field that the overlay focused at
 * the open.
 *
 * Each other press acts at once. A tap in the window on a control away from
 * the point of the first tap is a tap of its own, so it acts. A press after the
 * window acts. An overlay that a mouse, a pen, or a key opened stops nothing,
 * unless a finger lifted near the press in the window before the open.
 * Nothing waits. A pinch or a drag in the window makes no mouse events, so it
 * acts.
 *
 * @param open - Whether the overlay is open.
 * @returns The capture handlers for the root of the overlay.
 * @internal
 */
export function useOverlayAbsorb(open: boolean): OverlayAbsorb {
	// The last lift before the open. A lift in the overlay after the open is
	// not the lift of the tap that opened it, so the run does not follow it.
	const openingLiftRef = useRef<Lift | null>(null)

	// Whether the overlay stops the mouse events of the current press.
	const stoppingRef = useRef(false)

	useLayoutEffect(() => {
		if (!open) return

		openingLiftRef.current = lastLift

		stoppingRef.current = false
	}, [open])

	// The `mousedown`, the click, and the `dblclick` of a tap come after its
	// `pointerdown`, so the flag of the press stops each of them.
	const stop = (event: MouseEvent<Element>) => {
		// A click from a key or a script has no press (`detail` 0), so it acts.
		if (!stoppingRef.current || event.detail === 0) return

		event.preventDefault()

		event.stopPropagation()
	}

	return {
		onPointerDownCapture: (event) => {
			stoppingRef.current = continuesRun(event, openingLiftRef.current)
		},
		onMouseDownCapture: stop,
		onClickCapture: stop,
		onDoubleClickCapture: stop,
	}
}
