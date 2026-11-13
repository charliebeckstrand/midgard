'use client'

import { useRef } from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'
import { type TouchTap, useTouchTap } from '../../hooks/use-touch-tap'
import { holdTextSelection } from '../../utilities/hold-text-selection'
import { tapPress } from '../chart/engine/chart-press'
import type { ChartPress } from '../chart/engine/types'
import { targetAt } from './engine/map-hover/anchor'
import type { MapHoverTarget } from './engine/map-hover/target'

/**
 * Finds a tap on the plot, and picks the mark under it.
 *
 * A touch reads nothing from the map: it shows no tooltip and lights no mark.
 * Each tap picks the region or the overlay mark under its lift, as a click
 * does. The pick goes through `activate`, which is the path of the keyboard's
 * Enter, so a touch pick and a click carry the same identity. The press counts
 * the taps of a run, so the second tap of a double tap picks with a `count` of
 * 2, and a handler can gate on it.
 *
 * {@link useTouchTap} finds each tap and cancels the click of a touch. A
 * press that travels is a pan or a scroll, a long press is a hold, and a press
 * that a second finger joins is a pinch. {@link useTouchTap} reports none of
 * them as a tap, so none of them picks.
 *
 * Spread the handlers on the plot element. A tap off that element picks nothing.
 *
 * @param activate - Picks one target, as the keyboard cursor does.
 * @returns The press handlers. {@link TouchTap.fromTouch} tells the click
 * handler which clicks came from a touch.
 *
 * @internal
 */
export function useMapTouchTap(
	activate: (target: MapHoverTarget, press: ChartPress) => void,
): TouchTap {
	// The element that the handlers are on, from the last press.
	const plot = useRef<Element | null>(null)

	const pick = useStableEvent(activate)

	const touch = useTouchTap((x, y, count) => {
		const surface = plot.current

		const under = document.elementFromPoint(x, y)

		if (surface === null || under === null || !surface.contains(under)) return

		const target = targetAt(under)

		if (target !== null) pick(target, tapPress(count))
	})

	return {
		...touch,
		onPointerDown: (event) => {
			plot.current = event.currentTarget

			// A held touch starts a text selection on iOS, so hold it off the page.
			if (event.pointerType === 'touch') holdTextSelection(event)

			touch.onPointerDown(event)
		},
	}
}
