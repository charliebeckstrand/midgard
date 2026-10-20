'use client'

import { useLayoutEffect } from 'react'

// Reference count shared by nested overlays.
let lockCount = 0

let prevOverflow = ''

let paddingSide: 'paddingLeft' | 'paddingRight' = 'paddingRight'

let prevPadding = ''

/** Takes a lock: on the first holder hides body overflow and compensates the scrollbar gap, saving the prior inline styles to restore. @internal */
function acquireLock() {
	if (lockCount === 0) {
		const { body, documentElement } = document

		// A scrollbar on the left (RTL in WebKit and Gecko) moves the root box
		// right by its width. The sum is zero when the scrollbar is on the right,
		// also when the page is scrolled horizontally.
		const scrollbarLeft =
			Math.round(documentElement.getBoundingClientRect().left) + documentElement.scrollLeft !== 0

		paddingSide = scrollbarLeft ? 'paddingLeft' : 'paddingRight'

		prevOverflow = body.style.overflow

		prevPadding = body.style[paddingSide]

		// Pads the body by the scrollbar's width before hiding overflow,
		// replacing the space the scrollbar occupied. Applies only when a
		// vertical scrollbar is present.
		const hasScrollbar = documentElement.scrollHeight > documentElement.clientHeight

		const scrollbarWidth = window.innerWidth - documentElement.clientWidth

		body.style.overflow = 'hidden'

		if (hasScrollbar && scrollbarWidth > 0) {
			const padding = Number.parseFloat(window.getComputedStyle(body)[paddingSide]) || 0

			body.style[paddingSide] = `${padding + scrollbarWidth}px`
		}
	}

	lockCount++
}

/** Releases a lock; when the last holder drops, restores the saved overflow / padding. @internal */
function releaseLock() {
	lockCount--

	if (lockCount === 0) {
		document.body.style.overflow = prevOverflow

		document.body.style[paddingSide] = prevPadding
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

		acquireLock()

		return releaseLock
	}, [active])
}
