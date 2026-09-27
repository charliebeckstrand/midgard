/**
 * The cache interface that {@link getOrCompute} reads and writes. A `Map` and a
 * `WeakMap` both satisfy it.
 */
export type ComputeCache<K, V> = {
	get(key: K): V | undefined
	has(key: K): boolean
	set(key: K, value: V): unknown
}

/**
 * The value under `key` in `cache`, computed and stored on the first read. The
 * one get-or-compute step every memo in the package spells.
 *
 * @remarks
 * Give a `WeakMap` to memoize against an object, so the entry falls away with
 * the object. Give a `Map` for a key that is not an object, such as the inner
 * level of a two-level cache.
 *
 * A stored `undefined` is a hit. The `has` check runs only when `get` returns
 * `undefined`, so a hit on a defined value costs one lookup.
 *
 * @param cache - The backing map.
 * @param key - The key the value is memoized against.
 * @param compute - Builds the value on a miss.
 * @returns The cached value, computed first when absent.
 */
export function getOrCompute<K, V>(cache: ComputeCache<K, V>, key: K, compute: (key: K) => V): V {
	const hit = cache.get(key)

	if (hit !== undefined || cache.has(key)) return hit as V

	const computed = compute(key)

	cache.set(key, computed)

	return computed
}
