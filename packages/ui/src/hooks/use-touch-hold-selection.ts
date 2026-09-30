'use client'

import { type PointerEvent, useCallback, useEffect, useRef } from 'react'

/**
 * Time, in ms, that a hold keeps the guard on after the lift. iOS can set the
 * selection of a long press again when the finger lifts, after the lift reaches
 * the page.
 * @internal
 */
export const TOUCH_HOLD_SELECTION_SETTLE = 250

// The number of live holds. The first hold adds the document listeners and the last removes them.
let holds = 0

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
 * Releases a hold of {@link holdTouchSelection}. By default the guard stays on
 * for {@link TOUCH_HOLD_SELECTION_SETTLE}. With `now`, it ends at once, as on an
 * unmount, also when a settle is in progress.
 * @internal
 */
export type TouchSelectionRelease = (now?: boolean) => void

/**
 * Removes each text selection on the page until the returned release runs, and
 * for {@link TOUCH_HOLD_SELECTION_SETTLE} after it. For a touch hold that runs
 * outside React state. A second release does nothing, except a release with
 * `now` that ends a settle at once.
 *
 * @remarks The caller must release on each end of the hold. On unmount it
 * releases with `now`, so no listener outlives the surface.
 *
 * @internal
 */
export function holdTouchSelection(): TouchSelectionRelease {
	if (holds === 0) {
		document.addEventListener('selectionchange', clearRange)

		document.addEventListener('selectstart', refuseSelectStart, true)
	}

	holds += 1

	let state: 'live' | 'settling' | 'done' = 'live'

	let settle: ReturnType<typeof setTimeout> | undefined

	const end = () => {
		clearTimeout(settle)

		state = 'done'

		holds -= 1

		if (holds > 0) return

		document.removeEventListener('selectionchange', clearRange)

		document.removeEventListener('selectstart', refuseSelectStart, true)
	}

	return (now = false) => {
		if (state === 'done' || (state === 'settling' && !now)) return

		if (state === 'live') clearRange()

		if (now) {
			end()

			return
		}

		state = 'settling'

		settle = setTimeout(end, TOUCH_HOLD_SELECTION_SETTLE)
	}
}

/**
 * Keeps a touch hold on a surface from selecting text. A surface that does
 * something under a hold, such as a chart readout or a context menu, opts in
 * with this hook. Each such surface goes through it.
 *
 * @returns A `pointerdown` handler for the surface. A primary touch arms the
 * guard, and the lift or the cancel of that touch releases it. A mouse or a pen
 * press does nothing.
 *
 * @remarks iOS Safari selects text under a long press. It can select a label
 * in a `select-none` chart, or a range across the tiles near the finger, and
 * show its loupe and its callout. From the press until
 * {@link TOUCH_HOLD_SELECTION_SETTLE} after the lift, the guard removes each
 * range that the page selects, and cancels `selectstart`, which Chrome for
 * Android fires. The guard adds no style, so it causes no restyle. Text that the
 * reader selects at other times stays selected. The hook releases on unmount.
 *
 * @internal
 */
export function useTouchHoldSelection(): (event: PointerEvent<Element>) => void {
	// The release of the hold of the last press, which an unmount ends at once.
	const release = useRef<TouchSelectionRelease | null>(null)

	// Removes the window listeners of the last press.
	const listeners = useRef<AbortController | null>(null)

	useEffect(
		() => () => {
			listeners.current?.abort()

			release.current?.(true)
		},
		[],
	)

	return useCallback((event: PointerEvent<Element>) => {
		if (event.pointerType !== 'touch' || !event.isPrimary) return

		listeners.current?.abort()

		release.current?.(true)

		const { pointerId } = event

		const hold = holdTouchSelection()

		const controller = new AbortController()

		release.current = hold

		listeners.current = controller

		const lift = (native: globalThis.PointerEvent) => {
			if (native.pointerId !== pointerId) return

			controller.abort()

			hold()
		}

		// Window listeners, so the lift still ends the hold when the pointer leaves the surface.
		window.addEventListener('pointerup', lift, { capture: true, signal: controller.signal })

		window.addEventListener('pointercancel', lift, { capture: true, signal: controller.signal })
	}, [])
}
