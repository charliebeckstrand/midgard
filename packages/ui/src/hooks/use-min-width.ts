'use client'

import { useCallback, useSyncExternalStore } from 'react'

/** True when the viewport is at least `px` wide. Defaults to true during SSR. */
export function useMinWidth(px: number) {
	const subscribe = useCallback(
		(cb: () => void) => {
			const mql = window.matchMedia(`(min-width: ${px}px)`)

			mql.addEventListener('change', cb)

			return () => mql.removeEventListener('change', cb)
		},
		[px],
	)

	const getSnapshot = useCallback(() => {
		return window.matchMedia(`(min-width: ${px}px)`).matches
	}, [px])

	return useSyncExternalStore(subscribe, getSnapshot, () => true)
}
