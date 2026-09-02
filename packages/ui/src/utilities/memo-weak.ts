/**
 * The value under `key` in a {@link WeakMap}, computed and stored on the first
 * read. The one get-or-compute step every per-object memo in the package spells.
 *
 * @param cache - The backing map; entries fall away with their keys.
 * @param key - The object the value is memoized against.
 * @param compute - Builds the value on a miss.
 * @returns The cached value, computing it first when absent.
 */
export function memoWeak<K extends object, V>(
	cache: WeakMap<K, V>,
	key: K,
	compute: (key: K) => V,
): V {
	const hit = cache.get(key)

	if (hit !== undefined) return hit

	const computed = compute(key)

	cache.set(key, computed)

	return computed
}
