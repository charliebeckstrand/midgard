'use client'

import { getTabbableOptions } from '@floating-ui/react/utils'
import { type RefObject, useLayoutEffect } from 'react'
import { tabbable } from 'tabbable'

/**
 * Moves the focus into a modal overlay as it opens, without a scroll of the
 * page. The target is `initialFocus`, else the first element of the panel in
 * the tab order, else the root of the overlay.
 *
 * @remarks The focus manager of Floating UI focuses a field with a scroll. On
 * iOS, that focus opens the keyboard, and Safari scrolls the page under the
 * overlay to show the field. The body lock does not stop this scroll, and the
 * page stays at the new position after the overlay closes. A focus with
 * `preventScroll` does not move the page. Thus the overlay gives the focus
 * manager no initial focus and moves the focus itself.
 *
 * The focus moves in a microtask, after the layout effects of the commit set
 * their `tabindex`, as in the focus manager. The target comes from the same
 * list of tabbable elements. A press that opens the overlay on `pointerdown`
 * then gives the focus back to its target in its `mousedown`, so the next
 * frame moves the focus in again. A focus that already moved stays.
 *
 * @param floating - The root of the overlay, or `null` before it mounts.
 * @param open - Whether the overlay is open.
 * @param initialFocus - The element to focus first, if any.
 * @internal
 */
export function useOverlayInitialFocus(
	floating: HTMLElement | null,
	open: boolean,
	initialFocus: RefObject<HTMLElement | null> | undefined,
): void {
	useLayoutEffect(() => {
		if (!open || !floating) return

		const doc = floating.ownerDocument

		// The element that had the focus before the overlay opened.
		const before = doc.activeElement

		let cancelled = false

		// Moves the focus in while it is still on the element of before, or on
		// no element. A focus in the overlay stays. A focus that went anywhere
		// else, also into a popup of the panel in a portal, stays too.
		const focusIn = () => {
			const active = doc.activeElement

			if (cancelled || floating.contains(active)) return

			if (active !== before && active !== doc.body && active !== null) return

			const target =
				initialFocus?.current ?? tabbable(floating, getTabbableOptions())[0] ?? floating

			target.focus({ preventScroll: true })
		}

		queueMicrotask(focusIn)

		const frame = requestAnimationFrame(focusIn)

		return () => {
			cancelled = true

			cancelAnimationFrame(frame)
		}
	}, [open, floating, initialFocus])
}
