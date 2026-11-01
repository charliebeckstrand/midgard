'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { type KeyedStore, noopSubscribe } from '../utilities'

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
			store && key !== undefined ? store.subscribe(key, listener) : noopSubscribe(),
		[store, key],
	)

	const read = () => (store && key !== undefined ? store.get(key) : (fallback as V))

	return useSyncExternalStore(subscribe, read, read)
}
