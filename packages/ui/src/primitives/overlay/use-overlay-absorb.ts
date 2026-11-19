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

/**
 * Where and when the run starts, on the clock of `event.timeStamp`: the lift
 * of a finger, or the open when no lift is known. An open has no `point`.
 */
type Start = { at: number; point: { x: number; y: number } | null }

let lastLift: Start | null = null

function recordLift(event: globalThis.PointerEvent) {
	if (event.pointerType !== 'touch' || !event.isPrimary) return

	lastLift = { at: event.timeStamp, point: { x: event.clientX, y: event.clientY } }
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
 * Test-only: forgets the last lift, so the next case starts as a page where no
 * finger has lifted since the module loaded.
 *
 * @internal
 */
export function __resetFingerLift(): void {
	lastLift = null
}

/**
 * Whether a touch press continues the run from `start`: it starts in
 * {@link MULTI_TAP_WINDOW} of that start, and in {@link MULTI_TAP_DISTANCE} of
 * its point. `useTouchTap` joins two taps into a double tap with the same rule.
 * A start with no point lets a press anywhere continue the run.
 */
function continuesRun(event: PointerEvent<Element>, start: Start | null): boolean {
	if (event.pointerType !== 'touch' || start === null) return false

	if (event.timeStamp - start.at > MULTI_TAP_WINDOW) return false

	const { point } = start

	return (
		point === null ||
		Math.hypot(event.clientX - point.x, event.clientY - point.y) <= MULTI_TAP_DISTANCE
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
 * The press that opened the overlay can also send its `mousedown` to the
 * overlay. A tap that opens the overlay on its lift does this, because the
 * mouse events of a tap come after the lift. The overlay stops the default
 * action of each `mousedown` whose press did not start in the overlay, for each
 * type of input. Thus that `mousedown` does not move the focus that the open
 * put in the overlay. The overlay does not stop its propagation.
 *
 * Each other press acts at once. A tap in the window on a control away from
 * the point of the first tap is a tap of its own, so it acts. A press after the
 * window acts. An overlay that a mouse, a pen, or a key opened stops no second
 * tap, unless a finger lifted near the press in the window before the open.
 *
 * The lift comes from one listener that attaches when the module loads. An
 * overlay whose module loads on the open, through `import()`, knows no lift.
 * Its run then starts at the open, and each touch press in the window is the
 * second tap.
 * Nothing waits. A pinch or a drag in the window makes no mouse events, so it
 * acts.
 *
 * @param open - Whether the overlay is open.
 * @returns The capture handlers for the root of the overlay.
 * @internal
 */
export function useOverlayAbsorb(open: boolean): OverlayAbsorb {
	// The start of the run that opened the overlay. A lift in the overlay after
	// the open is not the lift of the tap that opened it, so the run does not
	// follow it.
	const startRef = useRef<Start | null>(null)

	// Whether the overlay stops the mouse events of the current press.
	const stoppingRef = useRef(false)

	// Whether a press started in the overlay after the open.
	const pressedRef = useRef(false)

	useLayoutEffect(() => {
		if (!open) return

		// The listener attaches when the module loads. An overlay whose module
		// loads on the open, through `import()`, mounts after the lift of the
		// tap that opened it, so no lift is known. The run then starts at the
		// open, and a touch press anywhere in the window continues it.
		startRef.current = lastLift ?? { at: performance.now(), point: null }

		stoppingRef.current = false

		pressedRef.current = false
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
			pressedRef.current = true

			stoppingRef.current = continuesRun(event, startRef.current)
		},
		onMouseDownCapture: (event) => {
			// The `mousedown` of the tap that opened the overlay. Its press started
			// before the overlay opened, so the overlay saw no `pointerdown` of it.
			if (!pressedRef.current) {
				event.preventDefault()

				return
			}

			stop(event)
		},
		onClickCapture: stop,
		onDoubleClickCapture: stop,
	}
}
