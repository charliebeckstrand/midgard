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

/** True when the viewport is at least 640 px wide. Defaults to true during SSR. */
export function useIsDesktop() {
	return useSyncExternalStore(subscribe, getSnapshot, () => true)
}
