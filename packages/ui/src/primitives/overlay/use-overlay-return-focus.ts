'use client'

import { type RefObject, useEffectEvent, useLayoutEffect } from 'react'

/**
 * Gives the focus back when a modal overlay unmounts. The target is
 * `returnFocusTo`, else the element that had the focus as the overlay opened.
 *
 * @remarks The focus manager of Floating UI returns the focus when it is
 * disabled, and the overlay disables it at the close. If the focus manager
 * returned the focus, the focus would go to the trigger at the start of the
 * exit, and a fast second Enter on a button of the panel would press the
 * trigger and open the overlay again. Thus the overlay gives the focus manager
 * no return focus and returns the focus itself, after the exit.
 *
 * The focus comes back only from `<body>`. The overlay moves the focus there
 * at the close, and the browser moves it there when the focused element of an
 * open overlay unmounts. A focus that went anywhere else during the exit stays.
 *
 * The call must be in the subtree that unmounts at the end of the exit.
 *
 * @param returnFocusTo - The element to focus at unmount, if any.
 * @internal
 */
export function useOverlayReturnFocus(
	returnFocusTo: RefObject<HTMLElement | null> | undefined,
): void {
	// The target at unmount, so a `returnFocusTo` set during the exit counts.
	const targetFor = useEffectEvent((before: Element | null) => returnFocusTo?.current ?? before)

	useLayoutEffect(() => {
		// The layout effects of a child run before the effects of its parent. The
		// initial focus of the overlay thus has not moved the focus yet.
		const before = document.activeElement

		return () => {
			const target = targetFor(before)

			// The microtask runs after the commit removes the overlay from the DOM.
			queueMicrotask(() => {
				if (!(target instanceof HTMLElement) || !target.isConnected) return

				const active = target.ownerDocument.activeElement

				if (active !== null && active !== target.ownerDocument.body) return

				target.focus({ preventScroll: true })
			})
		}
	}, [])
}
