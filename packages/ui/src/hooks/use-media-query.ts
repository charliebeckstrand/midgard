'use client'

import { useCallback, useSyncExternalStore } from 'react'

/** True when `query` matches the viewport. Defaults to true during SSR. */
export function useMediaQuery(query: string): boolean {
	const subscribe = useCallback(
		(cb: () => void) => {
			const mql = window.matchMedia(query)

			mql.addEventListener('change', cb)

			return () => mql.removeEventListener('change', cb)
		},
		[query],
	)

	const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query])

	return useSyncExternalStore(subscribe, getSnapshot, () => true)
}
