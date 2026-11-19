'use client'

import { getTabbableOptions } from '@floating-ui/react/utils'
import { type RefObject, useLayoutEffect } from 'react'
import { tabbable } from 'tabbable'

/** The last input on the page: the pointer type of a press, or `keyboard`. */
let lastInput: string | null = null

function recordPress(event: PointerEvent) {
	lastInput = event.pointerType
}

function recordKey() {
	lastInput = 'keyboard'
}

/**
 * Records the last input on the page. The press that opens an overlay comes
 * before the overlay mounts, so the listeners attach once, when the module
 * loads, and stay for the life of the page. They listen in the capture phase,
 * so a handler that stops the event does not hide it.
 */
function watchInput() {
	if (typeof window === 'undefined') return

	window.addEventListener('pointerdown', recordPress, { capture: true, passive: true })

	window.addEventListener('keydown', recordKey, { capture: true, passive: true })
}

watchInput()

/**
 * Test-only: forgets the last input, so the next case starts as a page with no
 * input since the module loaded.
 *
 * @internal
 */
export function __resetLastInput(): void {
	lastInput = null
}

/** The dialog of the overlay: its first element with the role of a dialog. */
function findDialog(floating: HTMLElement): HTMLElement | null {
	return floating.querySelector<HTMLElement>('[role="dialog"], [role="alertdialog"]')
}

/**
 * Moves the focus into a modal overlay as it opens, without a scroll of the
 * page. The target is `initialFocus`, else the first element of the panel in
 * the tab order, else the root of the overlay. After a touch, the target is
 * the dialog of the overlay when no `initialFocus` is given. The dialog must
 * have `tabindex="-1"`, as the panel of `PanelSurface` has.
 *
 * @remarks The focus manager of Floating UI focuses a field with a scroll. On
 * iOS, that focus opens the keyboard, and Safari scrolls the page under the
 * overlay to show the field. The body lock does not stop this scroll, and the
 * page stays at the new position after the overlay closes. A focus with
 * `preventScroll` does not move the page. Thus the overlay gives the focus
 * manager no initial focus and moves the focus itself.
 *
 * After a touch, a focus on a field opens the on-screen keyboard, also with
 * `preventScroll`. The keyboard covers the panel, and the browser scrolls the
 * page to show the field. An overlay in a container, such as an example of the
 * docs with `viewport`, is in the flow of the page, so the page moves. Thus a
 * touch focuses the dialog, and no keyboard opens. A screen reader then reads
 * the name of the dialog. The reader taps a field to type.
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

		// Whether a touch opened the overlay. Read at the open, so a later input
		// does not change the target.
		const touch = lastInput === 'touch'

		let cancelled = false

		// Moves the focus in while it is still on the element of before, or on
		// no element. A focus in the overlay stays. A focus that went anywhere
		// else, also into a popup of the panel in a portal, stays too.
		const focusIn = () => {
			const active = doc.activeElement

			if (cancelled || floating.contains(active)) return

			if (active !== before && active !== doc.body && active !== null) return

			const target =
				initialFocus?.current ??
				(touch ? findDialog(floating) : tabbable(floating, getTabbableOptions())[0]) ??
				floating

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
