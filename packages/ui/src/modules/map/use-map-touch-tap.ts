'use client'

import { useRef } from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'
import { type TouchTap, useTouchTap } from '../../hooks/use-touch-tap'
import { holdTextSelection } from '../../utilities/hold-text-selection'
import { targetAt } from './engine/map-hover/anchor'
import type { MapHoverTarget } from './engine/map-hover/target'

/** Time, in ms, from the lift of one tap to the lift of the next, in which the two are a double tap. @internal */
export const MAP_DOUBLE_TAP_WINDOW = 400

/** Distance, in CSS px, between the two taps of a double tap. @internal */
export const MAP_DOUBLE_TAP_SLOP = 40

type Tap = { x: number; y: number; at: number }

/**
 * Finds a double tap on the plot, and picks the mark under the second tap.
 *
 * A touch reads nothing from the map, and one tap picks nothing. Two taps that
 * lift in {@link MAP_DOUBLE_TAP_WINDOW} and land in {@link MAP_DOUBLE_TAP_SLOP}
 * of each other pick the region or the overlay mark under the second tap. The
 * pick goes through `activate`, which is the path of the keyboard's Enter, so a
 * touch pick and a click carry the same identity.
 *
 * {@link useTouchTap} finds each tap and cancels the click of a touch. A
 * press that a second finger joins is a pinch, and {@link useTouchTap} does not
 * report it as a tap.
 *
 * Spread the handlers on the plot element. A tap off that element picks nothing.
 *
 * @param activate - Picks one target, as the keyboard cursor does.
 * @returns The press handlers. {@link TouchTap.fromTouch} tells the click
 * handler which clicks came from a touch.
 *
 * @internal
 */
export function useMapTouchTap(activate: (target: MapHoverTarget) => void): TouchTap {
	// The element that the handlers are on, from the last press.
	const plot = useRef<Element | null>(null)

	// The last tap, which the next one can make a double tap.
	const prevTap = useRef<Tap | null>(null)

	const pick = useStableEvent(activate)

	const touch = useTouchTap((x, y) => {
		const prev = prevTap.current

		const at = performance.now()

		const double =
			prev !== null &&
			at - prev.at <= MAP_DOUBLE_TAP_WINDOW &&
			Math.hypot(x - prev.x, y - prev.y) <= MAP_DOUBLE_TAP_SLOP

		if (!double) {
			prevTap.current = { x, y, at }

			return
		}

		// A third tap starts a new pair.
		prevTap.current = null

		const surface = plot.current

		const under = document.elementFromPoint(x, y)

		if (surface === null || under === null || !surface.contains(under)) return

		const target = targetAt(under)

		if (target !== null) pick(target)
	})

	return {
		...touch,
		onPointerDown: (event) => {
			plot.current = event.currentTarget

			// A held touch starts a text selection on iOS, so hold it off the page.
			if (event.pointerType === 'touch') holdTextSelection(event)

			touch.onPointerDown(event)
		},
		onPointerCancel: () => {
			touch.onPointerCancel()

			prevTap.current = null
		},
	}
}
