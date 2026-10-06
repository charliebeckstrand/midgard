'use client'

import { useCallback, useLayoutEffect, useState, useSyncExternalStore } from 'react'
import { createKeyedStore, type KeyedStore, subscribeNothing } from '../utilities'

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

/**
 * Reads the value of one key from a {@link KeyedStore}.
 *
 * @param store - The store, or `null` to read `fallback`.
 * @param key - The key that the caller reads, or `undefined` to read `fallback`.
 * @param fallback - The value with no store or no key.
 * @returns The value of `key`. The caller renders only when this value changes.
 * @internal
 */
export function useKeyedValue<K, V>(store: KeyedStore<K, V>, key: K): V
export function useKeyedValue<K, V>(
	store: KeyedStore<K, V> | null,
	key: K | undefined,
	fallback: V,
): V
export function useKeyedValue<K, V>(
	store: KeyedStore<K, V> | null,
	key: K | undefined,
	fallback?: V,
): V {
	const subscribe = useCallback(
		(listener: () => void) =>
			store && key !== undefined ? store.subscribe(key, listener) : subscribeNothing(),
		[store, key],
	)

	const read = () => (store && key !== undefined ? store.get(key) : (fallback as V))

	return useSyncExternalStore(subscribe, read, read)
}
