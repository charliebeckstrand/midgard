'use client'

import { type PointerEvent, type TouchEvent, useRef } from 'react'
import { useTimeout } from '../../../hooks'
import { useStableEvent } from '../../../hooks/use-stable-event'
import { useTouchHoldSelection } from '../../../hooks/use-touch-hold-selection'

/** Hold time, in ms, before a touch opens the readout. A tap opens none. @internal */
export const TOUCH_READOUT_DELAY = 300

/** Travel, in CSS px, past which a touch press is a drag or a scroll and not a tap. @internal */
export const TOUCH_TAP_SLOP = 10

/** The press handlers {@link useChartTouchTap} gives. Spread them next to the hover handlers. @internal */
export type ChartTouchTap = {
	onPointerDown: (event: PointerEvent<Element>) => void
	onPointerMove: (event: PointerEvent<Element>) => void
	onPointerUp: (event: PointerEvent<Element>) => void
	onPointerCancel: () => void
	/**
	 * Cancels the click that the browser makes from a touch press. The tap
	 * already reported, and a hold only reads the chart. Without it, the browser
	 * can send that click to a control near the finger, such as a legend switch
	 * below the plot. See {@link useChartTouchTap}.
	 */
	onTouchEnd: (event: TouchEvent<Element>) => void
	/**
	 * Whether the click that follows came from a touch press. The tap already
	 * reported it, so the click handler must ignore it.
	 */
	fromTouch: () => boolean
}

type Press = { x: number; y: number; tap: boolean }

/**
 * Finds a tap in the pointer events of a touch, and reports it from the lift.
 *
 * A tap is a touch press that lifts before {@link TOUCH_READOUT_DELAY} and
 * travels less than {@link TOUCH_TAP_SLOP}. A longer press is a hold, which
 * reads the chart. A press that travels is a scrub or a scroll. A cancelled
 * press is a scroll that the browser took. None of these is a tap.
 *
 * @remarks The tap does not come from `click`. On a tap that changes the page,
 * iOS Safari treats the tap as a hover and holds back the click until a second
 * tap. A hold that opens the readout is such a change. The lift fires on each
 * tap, so a tap reports once whatever the browser does with the click. The
 * click of a touch press is therefore ignored: {@link ChartTouchTap.fromTouch}
 * tells the click handler which clicks those are. A mouse or a pen press
 * reports through `click` as before.
 *
 * The click of a touch press can also land on a different element. A mobile
 * browser moves the click of a finger to the best control in the contact
 * area, and iOS Safari does this after it sends the pointer events to the mark.
 * A tap at the bottom of a donut therefore selected the slice from the lift,
 * and then its click toggled the legend switch below the plot.
 * {@link ChartTouchTap.onTouchEnd} cancels that click, so a touch press on the
 * marks reports through the lift alone.
 *
 * A touch press also arms `useTouchHoldSelection`, so a hold selects no
 * label near the finger.
 * @param onTap - Called with the viewport point of the lift. It can change on
 * each render.
 * @internal
 */
export function useChartTouchTap(onTap: (clientX: number, clientY: number) => void): ChartTouchTap {
	const press = useRef<Press | null>(null)

	// Whether the last press was a touch, so the click that it gives is ignored.
	const touched = useRef(false)

	const tap = useStableEvent(onTap)

	// Ends the tap window of a press: past it, the press is a hold.
	const tapWindow = useTimeout()

	// A hold reads the chart. It does not select a label near the finger.
	const guardSelection = useTouchHoldSelection()

	return {
		onPointerDown: (event) => {
			touched.current = event.pointerType === 'touch'

			tapWindow.clear()

			if (!touched.current) {
				press.current = null

				return
			}

			guardSelection(event)

			const current = { x: event.clientX, y: event.clientY, tap: true }

			press.current = current

			tapWindow.set(() => {
				current.tap = false
			}, TOUCH_READOUT_DELAY)
		},
		onPointerMove: (event) => {
			const current = press.current

			if (current === null || event.pointerType !== 'touch') return

			if (Math.hypot(event.clientX - current.x, event.clientY - current.y) > TOUCH_TAP_SLOP) {
				current.tap = false
			}
		},
		onPointerUp: (event) => {
			const current = press.current

			press.current = null

			tapWindow.clear()

			if (current === null || event.pointerType !== 'touch' || !current.tap) return

			tap(event.clientX, event.clientY)
		},
		onPointerCancel: () => {
			press.current = null

			tapWindow.clear()
		},
		onTouchEnd: (event) => {
			// The browser makes no click from a touch end that is cancelled. A touch
			// end that follows a scroll cannot be cancelled.
			if (event.cancelable) event.preventDefault()
		},
		fromTouch: () => {
			const touch = touched.current

			touched.current = false

			return touch
		},
	}
}
