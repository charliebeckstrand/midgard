'use client'

import { useEffect } from 'react'

// Reference count shared by nested overlays.
let scrollLockCount = 0

let scrollLockPreviousOverflow = ''

let scrollLockPreviousPaddingRight = ''

/** Takes a lock: on the first holder hides body overflow and compensates the scrollbar gap, saving the prior inline styles to restore. @internal */
function acquireScrollLock() {
	if (typeof document === 'undefined') return

	if (scrollLockCount === 0) {
		const { body, documentElement } = document

		scrollLockPreviousOverflow = body.style.overflow

		scrollLockPreviousPaddingRight = body.style.paddingRight

		// Pads the body by the scrollbar's width before hiding overflow,
		// replacing the space the scrollbar occupied. Applies only when a
		// vertical scrollbar is present.
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

/** Releases a lock; when the last holder drops, restores the saved overflow / padding. @internal */
function releaseScrollLock() {
	if (typeof document === 'undefined') return

	scrollLockCount--

	if (scrollLockCount === 0) {
		document.body.style.overflow = scrollLockPreviousOverflow

		document.body.style.paddingRight = scrollLockPreviousPaddingRight
	}
}

/**
 * Locks `document.body` overflow while `active` is true. Nested locks are
 * reference-counted: the body unlocks only when the last holder releases.
 *
 * @remarks Compensates the removed scrollbar's width with body padding so the
 * page doesn't shift on lock. The lock is acquired in an effect and released on
 * cleanup or when `active` goes false; no-ops during SSR.
 */
export function useScrollLock(active: boolean): void {
	useEffect(() => {
		if (!active) return

		acquireScrollLock()

		return releaseScrollLock
	}, [active])
}
