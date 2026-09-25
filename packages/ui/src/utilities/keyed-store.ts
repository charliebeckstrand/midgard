/**
 * A store that holds one value for each key, and calls only the listeners of
 * the keys whose value changed.
 *
 * @remarks
 * A context that holds a whole collection renders each consumer again when one
 * entry changes. A consumer that reads this store through `useSyncExternalStore`
 * subscribes to its own key, so a change reaches only the consumers of the keys
 * that changed.
 */
export type KeyedStore<K, V> = {
	/** The current value of `key`. */
	get: (key: K) => V
	/** Calls `listener` each time the value of `key` changes, and returns the unsubscribe. */
	subscribe: (key: K, listener: () => void) => () => void
	/**
	 * Replaces the values with those that `read` gives. It then calls the
	 * listeners of each subscribed key whose value changed by `Object.is`.
	 */
	publish: (read: (key: K) => V) => void
}

/**
 * A new {@link KeyedStore}.
 *
 * @param read - Gives the value of a key. It must read an immutable snapshot,
 * such as a `Map` or a `Set` that the caller does not change after a publish.
 * The next publish compares the old values with the new ones.
 * @returns The store, with the values that `read` gives.
 * @remarks A publish costs one read for each subscribed key, not for each key
 * of the collection.
 */
export function createKeyedStore<K, V>(read: (key: K) => V): KeyedStore<K, V> {
	let current = read

	const listeners = new Map<K, Set<() => void>>()

	return {
		get: (key) => current(key),
		subscribe: (key, listener) => {
			let set = listeners.get(key)

			if (!set) {
				set = new Set()

				listeners.set(key, set)
			}

			set.add(listener)

			return () => {
				set.delete(listener)

				if (set.size === 0) listeners.delete(key)
			}
		},
		publish: (next) => {
			const previous = current

			current = next

			for (const [key, set] of listeners) {
				if (Object.is(previous(key), next(key))) continue

				for (const listener of [...set]) listener()
			}
		},
	}
}
