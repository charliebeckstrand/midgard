'use client'

import { useSyncExternalStore } from 'react'
import { isEventsPinned, subscribePinned } from './engine/events-setting'

const pinnedOnServer = () => false

/**
 * Whether the panel is pinned. The server does not know the setting, so the
 * first render after hydration reads it.
 *
 * @internal
 */
export function useEventsPinned(): boolean {
	return useSyncExternalStore(subscribePinned, isEventsPinned, pinnedOnServer)
}
