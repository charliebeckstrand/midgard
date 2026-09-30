'use client'

import { type PointerEvent, useCallback, useEffect, useRef } from 'react'

/** The Tailwind class that the guard sets on `<html>` for the span of a hold. */
const GUARD_CLASS = 'select-none'

// The number of live holds. The first hold arms the guard and the last removes it.
let holds = 0

// Whether the guard added the class, so a page that sets it on `<html>` keeps it.
let added = false

/** Cancels a selection that starts during a hold, as on Android. @internal */
function refuseSelectStart(event: Event) {
	event.preventDefault()
}

/**
 * Stops text selection on the whole page until the returned release runs. For a
 * touch hold that runs outside React state. The release is idempotent.
 *
 * @remarks The caller must release on each end of the hold, and also on
 * unmount. A hold that is not released keeps the page unselectable.
 *
 * @internal
 */
export function holdTouchSelection(): () => void {
	if (holds === 0) {
		const root = document.documentElement

		added = !root.classList.contains(GUARD_CLASS)

		if (added) root.classList.add(GUARD_CLASS)

		document.addEventListener('selectstart', refuseSelectStart, true)
	}

	holds += 1

	let live = true

	return () => {
		if (!live) return

		live = false

		holds -= 1

		if (holds > 0) return

		if (added) document.documentElement.classList.remove(GUARD_CLASS)

		added = false

		document.removeEventListener('selectstart', refuseSelectStart, true)
	}
}

/**
 * Keeps a touch hold on a surface from selecting text anywhere on the page. Every
 * touch hold in the library goes through this guard.
 *
 * @returns A `pointerdown` handler for the surface. A primary touch arms the
 * guard, and the lift or the cancel of that touch releases it. A mouse or a pen
 * press does nothing.
 *
 * @remarks iOS Safari starts a long-press selection when the node under the
 * finger is selectable at the moment of the gesture. It then selects the nearest
 * selectable text to the finger, which can be far from the surface. A hold can
 * put a selectable node under the finger in three ways: the finger drifts off a
 * small surface, the hold changes the page under the finger, or the surface is
 * selectable by design, such as the target of a context menu. The guard sets
 * `select-none` on `<html>` from the press to the lift. Safari takes the used
 * `user-select` of each `auto` node from its parent, so no text on the page is
 * selectable for the span of the hold. Fields and nodes that set `select-text`
 * keep their own value. The guard also cancels `selectstart`, which Chrome for
 * Android fires before it selects a word under a long press.
 *
 * The guard arms at the press, not when the hold time ends. iOS can read the
 * node under the finger when the touch starts. A surface that nests in another
 * hold surface arms a second hold on the same press, and the guard counts the
 * holds. The hook releases on unmount. It does nothing during SSR.
 *
 * @internal
 */
export function useTouchHoldSelection(): (event: PointerEvent<Element>) => void {
	// Ends the live hold: releases the guard and removes the window listeners.
	const end = useRef<(() => void) | null>(null)

	useEffect(
		() => () => {
			end.current?.()
		},
		[],
	)

	return useCallback((event: PointerEvent<Element>) => {
		if (event.pointerType !== 'touch' || !event.isPrimary || end.current !== null) return

		const { pointerId } = event

		const release = holdTouchSelection()

		const listeners = new AbortController()

		const stop = () => {
			release()

			listeners.abort()

			end.current = null
		}

		// Window listeners, so the lift still ends the hold when the page removes the
		// node under the finger or the pointer leaves the surface.
		const lift = (native: globalThis.PointerEvent) => {
			if (native.pointerId === pointerId) stop()
		}

		window.addEventListener('pointerup', lift, { capture: true, signal: listeners.signal })

		window.addEventListener('pointercancel', lift, { capture: true, signal: listeners.signal })

		end.current = stop
	}, [])
}
