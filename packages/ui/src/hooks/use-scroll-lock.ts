'use client'

import { useEffect } from 'react'

// Reference-counted; nested overlays don't release the lock prematurely.
let scrollLockCount = 0

let scrollLockPreviousOverflow = ''

let scrollLockPreviousPaddingRight = ''

function acquireScrollLock() {
	if (typeof document === 'undefined') return

	if (scrollLockCount === 0) {
		const { body, documentElement } = document

		scrollLockPreviousOverflow = body.style.overflow

		scrollLockPreviousPaddingRight = body.style.paddingRight

		// Pad the body by the scrollbar's width before hiding overflow — absorbs
		// the space the scrollbar occupied, avoiding a layout shift. Applied
		// only when a vertical scrollbar is present.
		const hasScrollbar = documentElement.scrollHeight > documentElement.clientHeight

		const scrollbarWidth = window.innerWidth - documentElement.clientWidth

		body.style.overflow = 'hidden'

		if (hasScrollbar && scrollbarWidth > 0) {
			const current = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0

			body.style.paddingRight = `${current + scrollbarWidth}px`
		}
	}

	scrollLockCount++
}

function releaseScrollLock() {
	if (typeof document === 'undefined') return

	scrollLockCount--

	if (scrollLockCount === 0) {
		document.body.style.overflow = scrollLockPreviousOverflow

		document.body.style.paddingRight = scrollLockPreviousPaddingRight
	}
}

/** Lock `document.body.style.overflow` while `active` is true. Nested locks are reference-counted. */
export function useScrollLock(active: boolean): void {
	useEffect(() => {
		if (!active) return

		acquireScrollLock()

		return releaseScrollLock
	}, [active])
}
