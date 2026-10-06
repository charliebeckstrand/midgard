'use client'

import { useLayoutEffect } from 'react'

// Reference count shared by nested overlays.
let scrollLockCount = 0

let scrollLockPreviousOverflow = ''

let scrollLockPaddingSide: 'paddingLeft' | 'paddingRight' = 'paddingRight'

let scrollLockPreviousPadding = ''

/** Takes a lock: on the first holder hides body overflow and compensates the scrollbar gap, saving the prior inline styles to restore. @internal */
function acquireScrollLock() {
	if (scrollLockCount === 0) {
		const { body, documentElement } = document

		// A scrollbar on the left (RTL in WebKit and Gecko) moves the root box
		// right by its width. The sum is zero when the scrollbar is on the right,
		// also when the page is scrolled horizontally.
		const scrollbarLeft =
			Math.round(documentElement.getBoundingClientRect().left) + documentElement.scrollLeft !== 0

		scrollLockPaddingSide = scrollbarLeft ? 'paddingLeft' : 'paddingRight'

		scrollLockPreviousOverflow = body.style.overflow

		scrollLockPreviousPadding = body.style[scrollLockPaddingSide]

		// Pads the body by the scrollbar's width before hiding overflow,
		// replacing the space the scrollbar occupied. Applies only when a
		// vertical scrollbar is present.
		const hasScrollbar = documentElement.scrollHeight > documentElement.clientHeight

		const scrollbarWidth = window.innerWidth - documentElement.clientWidth

		body.style.overflow = 'hidden'

		if (hasScrollbar && scrollbarWidth > 0) {
			const current = Number.parseFloat(window.getComputedStyle(body)[scrollLockPaddingSide]) || 0

			body.style[scrollLockPaddingSide] = `${current + scrollbarWidth}px`
		}
	}

	scrollLockCount++
}

/** Releases a lock; when the last holder drops, restores the saved overflow / padding. @internal */
function releaseScrollLock() {
	scrollLockCount--

	if (scrollLockCount === 0) {
		document.body.style.overflow = scrollLockPreviousOverflow

		document.body.style[scrollLockPaddingSide] = scrollLockPreviousPadding
	}
}

/**
 * Locks `document.body` overflow while `active` is true. Nested locks are
 * reference-counted: the body unlocks only when the last holder releases.
 *
 * @remarks Compensates the removed scrollbar's width with body padding on the
 * side of the scrollbar, so the page does not move on lock. The lock is taken
 * in a layout effect, before the browser paints the commit that opens the
 * overlay, and released on cleanup or when `active` goes false. It does
 * nothing during SSR.
 */
export function useScrollLock(active: boolean): void {
	useLayoutEffect(() => {
		if (!active) return

		acquireScrollLock()

		return releaseScrollLock
	}, [active])
}
