'use client'

import { type PointerEvent, useCallback, useEffect, useRef } from 'react'

/**
 * Time, in ms, that a hold keeps the guard on after the lift. iOS can start a
 * selection after the lift reaches the page.
 * @internal
 */
export const TOUCH_HOLD_SELECTION_SETTLE = 300

/** The Tailwind class that the guard sets on `<html>` for the span of a hold. */
const GUARD_CLASS = 'select-none'

// The number of live holds. The first hold arms the guard and the last removes it.
let holds = 0

// Whether the guard added the class, so a page that sets it on `<html>` keeps it.
let added = false

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
 * Stops text selection on the page until the returned release runs, and for
 * {@link TOUCH_HOLD_SELECTION_SETTLE} after it. For a touch hold that runs
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
		const root = document.documentElement

		added = !root.classList.contains(GUARD_CLASS)

		if (added) root.classList.add(GUARD_CLASS)

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

		if (added) document.documentElement.classList.remove(GUARD_CLASS)

		added = false

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
 * @remarks iOS starts a long-press selection, with its loupe and its callout,
 * although the surface is `select-none`. The selection can then land on any
 * text near the finger, such as a chart label or a readout. A `select-none` on
 * the surface or a script that removes the range does not stop the loupe. Only
 * a `select-none` on the whole page does, as React Aria also found for its
 * press hooks. From the press until {@link TOUCH_HOLD_SELECTION_SETTLE} after
 * the lift, the guard therefore sets `select-none` on `<html>`, removes each
 * range that the page selects, and cancels `selectstart`, which Chrome for
 * Android fires. Fields and nodes that set `select-text` keep their own value.
 *
 * The class on `<html>` restyles the page once at the press and once at the
 * end of the settle, so only a surface with a hold behavior opts in. A mouse or
 * a pen press arms nothing. The hook releases on unmount.
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
