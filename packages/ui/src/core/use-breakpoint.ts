'use client'

import { useSyncExternalStore } from 'react'

const smQuery = typeof window !== 'undefined' ? window.matchMedia('(min-width: 640px)') : null

function subscribe(cb: () => void) {
	smQuery?.addEventListener('change', cb)

	return () => smQuery?.removeEventListener('change', cb)
}

function getSnapshot() {
	return smQuery?.matches ?? true
}

/** Returns `true` when viewport is ≥ sm (640px). SSR defaults to `true`. */
export function useIsDesktop() {
	return useSyncExternalStore(subscribe, getSnapshot, () => true)
}
