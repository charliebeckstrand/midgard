'use client'

import { useLayoutEffect, useState } from 'react'
import { createKeyedStore, type KeyedStore } from '../utilities'

/**
 * A {@link KeyedStore} that follows a snapshot of the render.
 *
 * @param snapshot - The value that the store reads, such as the current id or the open set.
 * @param reader - Makes the reader of a key from a snapshot. Give a function that
 * keeps its identity, such as a module function. A new function publishes again.
 * @returns A store that keeps its identity. The hook publishes a new snapshot to
 * it in a layout effect, so a change calls only the listeners of the keys whose
 * value changed.
 * @remarks A collection gives the store to its items in place of the snapshot.
 * Each item reads its own key through {@link useKeyedValue}.
 * @internal
 */
export function useKeyedStore<S, K, V>(
	snapshot: S,
	reader: (snapshot: S) => (key: K) => V,
): KeyedStore<K, V> {
	const [store] = useState(() => createKeyedStore(reader(snapshot)))

	useLayoutEffect(() => {
		store.publish(reader(snapshot))
	}, [store, reader, snapshot])

	return store
}

/**
 * A {@link useKeyedStore} reader for one selected key, such as the lifted id or
 * the current value.
 *
 * @returns A reader that gives `true` for `selected` alone.
 * @internal
 */
export function keyMatcher<K>(selected: K | null | undefined): (key: K) => boolean {
	return (key) => key === selected
}
