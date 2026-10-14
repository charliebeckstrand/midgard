'use client'

import { useState, useSyncExternalStore } from 'react'
import { noopSubscribe } from '../../utilities/noop'
import { start } from './engine/events-recorder'
import { getEventsOptions } from './engine/events-setting'
import type { EventStore } from './engine/events-store'

/**
 * Subscribes to the changes of a store, one call for each frame at most. A
 * burst of events, such as the eight events of a tap, then renders a live
 * view one time.
 */
function subscribeEachFrame(store: EventStore) {
	return (listener: () => void) => {
		let frame = 0

		const unsubscribe = store.subscribe(() => {
			frame ||= requestAnimationFrame(() => {
				frame = 0

				listener()
			})
		})

		return () => {
			cancelAnimationFrame(frame)

			unsubscribe()
		}
	}
}

/**
 * The store of the tab and its state. It starts the store with the options
 * of the app when the app did not start it. While `live` is off, such as in a
 * closed sheet, it does not render for a new event.
 *
 * @internal
 */
export function useEvents(live: boolean) {
	const [store] = useState(() => start(getEventsOptions()))

	const [subscribeLive] = useState(() => subscribeEachFrame(store))

	const subscribe = live ? subscribeLive : noopSubscribe

	const entries = useSyncExternalStore(subscribe, () => store.entries)

	const preserve = useSyncExternalStore(subscribe, () => store.preserve)

	const batched = useSyncExternalStore(subscribe, () => store.batched)

	const capturing = useSyncExternalStore(subscribe, () => store.capturing)

	return { store, entries, preserve, batched, capturing }
}
