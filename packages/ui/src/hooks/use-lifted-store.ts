'use client'

import { useCallback, useLayoutEffect, useState, useSyncExternalStore } from 'react'
import { createKeyedStore, type KeyedStore } from '../utilities'

/**
 * A keyed store that holds whether each id is the keyboard-lifted id.
 *
 * @param liftedId - The lifted id, or `null`.
 * @returns A store that keeps its identity. The hook publishes `liftedId` to it
 * in a layout effect.
 * @remarks A reorderable collection gives the store to its items in place of
 * the lifted id. A lift then renders only the item that lifts and the item that
 * drops, not each item.
 * @internal
 */
export function useLiftedStore(liftedId: string | null): KeyedStore<string, boolean> {
	const [store] = useState(() => createKeyedStore((id: string) => id === liftedId))

	useLayoutEffect(() => {
		store.publish((id) => id === liftedId)
	}, [store, liftedId])

	return store
}

/**
 * Reads whether `id` is lifted from a store that {@link useLiftedStore} makes.
 *
 * @returns `true` while `id` is the lifted id. The caller renders only when this
 * value changes.
 * @internal
 */
export function useLifted(store: KeyedStore<string, boolean>, id: string): boolean {
	const subscribe = useCallback(
		(listener: () => void) => store.subscribe(id, listener),
		[store, id],
	)

	const read = () => store.get(id)

	return useSyncExternalStore(subscribe, read, read)
}
