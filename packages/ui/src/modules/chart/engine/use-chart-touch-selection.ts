'use client'

import { type PointerEvent, useCallback, useEffect, useRef } from 'react'

/**
 * Time, in ms, that the guard stays on after the lift. iOS can set the selection
 * of a long press again when the finger lifts, after the lift reaches the page.
 * @internal
 */
export const CHART_SELECTION_SETTLE = 250

/** Removes the selection when it holds a range. A caret selects nothing. @internal */
function clearRange() {
	const selection = document.getSelection()

	if (selection && !selection.isCollapsed) selection.removeAllRanges()
}

/** Cancels a selection that starts during a hold, as on Android. @internal */
function refuseSelectStart(event: Event) {
	event.preventDefault()
}

/**
 * Removes the text selection that a touch hold on the chart makes.
 *
 * @returns A `pointerdown` handler for the chart. A primary touch arms the guard.
 * A mouse or a pen press does nothing.
 *
 * @remarks iOS Safari selects text under a long press, and it can select a chart
 * label although the chart is `select-none`. A hold on a bar can thus select an
 * axis label near the finger. From the press until {@link CHART_SELECTION_SETTLE}
 * after the lift, the guard removes each range that the page selects, and cancels
 * `selectstart`, which Chrome for Android fires. The guard adds no style, so it
 * causes no restyle. Text that the reader selects at other times stays selected.
 * The hook releases the guard on unmount.
 *
 * @internal
 */
export function useChartTouchSelection(): (event: PointerEvent<Element>) => void {
	// Ends the live guard: removes its listeners and its settle timer.
	const end = useRef<(() => void) | null>(null)

	useEffect(
		() => () => {
			end.current?.()
		},
		[],
	)

	return useCallback((event: PointerEvent<Element>) => {
		if (event.pointerType !== 'touch' || !event.isPrimary) return

		end.current?.()

		const { pointerId } = event

		const listeners = new AbortController()

		const { signal } = listeners

		let settle: ReturnType<typeof setTimeout> | undefined

		const stop = () => {
			clearTimeout(settle)

			listeners.abort()

			end.current = null
		}

		const lift = (native: globalThis.PointerEvent) => {
			if (native.pointerId !== pointerId) return

			clearRange()

			clearTimeout(settle)

			settle = setTimeout(stop, CHART_SELECTION_SETTLE)
		}

		document.addEventListener('selectionchange', clearRange, { signal })

		document.addEventListener('selectstart', refuseSelectStart, { capture: true, signal })

		// Window listeners, so the lift still ends the guard when the pointer leaves the chart.
		window.addEventListener('pointerup', lift, { capture: true, signal })

		window.addEventListener('pointercancel', lift, { capture: true, signal })

		end.current = stop
	}, [])
}
