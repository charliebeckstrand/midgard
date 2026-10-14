'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { matchesMediaQuery, subscribeMediaQuery } from '../utilities/media-query'

/** True when `query` matches the viewport. Defaults to true during SSR. */
export function useMediaQuery(query: string): boolean {
	const subscribe = useCallback(
		(callback: () => void) => subscribeMediaQuery(query, callback),
		[query],
	)

	const getSnapshot = useCallback(() => matchesMediaQuery(query), [query])

	return useSyncExternalStore(subscribe, getSnapshot, () => true)
}
