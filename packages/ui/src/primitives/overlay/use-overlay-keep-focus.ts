'use client'

import { getTabbableOptions } from '@floating-ui/react/utils'
import { useLayoutEffect } from 'react'
import { tabbable } from 'tabbable'

/**
 * Keeps the focus in an open modal overlay when the focused element of the
 * overlay unmounts. The focus moves to the first element of the panel in the
 * tab order, else to the root of the overlay, without a scroll of the page.
 *
 * @remarks The browser moves the focus to `<body>` when the focused element
 * leaves the DOM. A Drawer that shows its next step on a press of a card
 * removes the card, so the focus left the Drawer. The focus manager of Floating
 * UI can move the focus back (`restoreFocus`), but only for a floating element
 * with a reference, and an overlay has no reference. Not all browsers send a
 * `focusout` for an element that leaves the DOM. A mutation observer sees each
 * removal.
 *
 * The observer callback runs after the commit, so a focus that the new content
 * takes in its layout effects stays. The focus moves only from `<body>`, and
 * only when the element that last had the focus in the overlay is gone. A
 * press on a part of the panel that cannot get the focus thus does not move
 * the focus at the next change of the DOM.
 *
 * @param floating - The root of the overlay while it is open, else `null`.
 * @internal
 */
export function useOverlayKeepFocus(floating: HTMLElement | null): void {
	useLayoutEffect(() => {
		if (!floating) return

		const doc = floating.ownerDocument

		// The element in the overlay that had the focus last.
		let last: Element | null = floating.contains(doc.activeElement) ? doc.activeElement : null

		const track = (event: FocusEvent) => {
			if (event.target instanceof Element) last = event.target
		}

		const observer = new MutationObserver(() => {
			if (!last || last.isConnected) return

			const active = doc.activeElement

			if (active !== null && active !== doc.body) return

			const target = tabbable(floating, getTabbableOptions())[0] ?? floating

			target.focus({ preventScroll: true })
		})

		floating.addEventListener('focusin', track)

		observer.observe(floating, { childList: true, subtree: true })

		return () => {
			floating.removeEventListener('focusin', track)

			observer.disconnect()
		}
	}, [floating])
}
