/** Merges two or more colour maps with matching keys. */
export function merge<K extends string>(
	...maps: [Record<K, string[]>, ...Record<K, string[]>[]]
): Record<K, string[]> {
	const [first] = maps

	return Object.fromEntries(
		(Object.keys(first) as K[]).map((k) => [k, maps.flatMap((m) => m[k])]),
	) as Record<K, string[]>
}
