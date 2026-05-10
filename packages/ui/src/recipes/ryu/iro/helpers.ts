/** Merges two or more colour maps with matching keys. */
export function merge<K extends string>(
	...maps: [Record<K, string[]>, ...Record<K, string[]>[]]
): Record<K, string[]> {
	const [first] = maps

	return Object.fromEntries(
		(Object.keys(first) as K[]).map((k) => [k, maps.flatMap((m) => m[k])]),
	) as Record<K, string[]>
}

/**
 * Pick named slots from a palette variant and merge them into a colour map.
 *
 * @example
 *   pickSlots(iro.palette.solid, 'bg', 'text', 'hover')
 *   // ≡ merge(solid.bg, solid.text, solid.hover)
 */
export function pickSlots<S extends string, C extends string>(
	variant: Record<S, Record<C, string[]>>,
	...slots: readonly [S, ...S[]]
): Record<C, string[]> {
	const [first, ...rest] = slots

	return merge(variant[first], ...rest.map((s) => variant[s]))
}
