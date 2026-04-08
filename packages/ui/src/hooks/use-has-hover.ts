'use client'

import { useSyncExternalStore } from 'react'

const hoverQuery = typeof window !== 'undefined' ? window.matchMedia('(hover: hover)') : null

function subscribe(cb: () => void) {
	hoverQuery?.addEventListener('change', cb)

	return () => hoverQuery?.removeEventListener('change', cb)
}

function getSnapshot() {
	return hoverQuery?.matches ?? true
}

/** Returns `true` when the device has a hover-capable pointer (e.g. mouse). SSR defaults to `true`. */
export function useHasHover() {
	return useSyncExternalStore(subscribe, getSnapshot, () => true)
}
