'use client'

import { useLayoutEffect } from 'react'
import type { EventStore } from './engine/events-store'

/**
 * Pauses the store while a sheet of the tools is open, so the store does not
 * record the sheet itself.
 *
 * @internal
 */
export function useEventsPause(store: EventStore, open: boolean): void {
	// A layout effect runs before the effect of the overlay that reports the
	// open, so the store does not record the open of the sheet. A sheet that
	// unmounts while it is open does not leave the store paused.
	useLayoutEffect(() => {
		store.setPaused(open)

		return () => {
			store.setPaused(false)
		}
	}, [store, open])
}
