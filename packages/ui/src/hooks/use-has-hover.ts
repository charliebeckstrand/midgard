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

/** True when the device has a hover-capable pointer. Defaults to true during SSR. */
export function useHasHover() {
	return useSyncExternalStore(subscribe, getSnapshot, () => true)
}
