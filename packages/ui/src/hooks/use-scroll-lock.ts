'use client'

import { useEffect } from 'react'

// Reference-counted so nested overlays don't release the lock prematurely.
let scrollLockCount = 0

let scrollLockPrevious = ''

function acquireScrollLock() {
	if (typeof document === 'undefined') return

	if (scrollLockCount === 0) {
		scrollLockPrevious = document.body.style.overflow

		document.body.style.overflow = 'hidden'
	}

	scrollLockCount++
}

function releaseScrollLock() {
	if (typeof document === 'undefined') return

	scrollLockCount--

	if (scrollLockCount === 0) {
		document.body.style.overflow = scrollLockPrevious
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
