/**
 * Merges multiple per-key class records into one, concatenating each key's
 * arrays. Used by kata that want a pre-merged variant × colour bundle outside
 * the recipe engine's compound expansion — for instance, calendar reading
 * button's soft palette to render a selected-cell colour.
 *
 * @example
 *   const { soft } = iro.palette
 *   const buttonSoft = merge(soft.bg, soft.text, soft.hover)
 *   // buttonSoft.blue is the merged blue classes from all three slots
 */

export function merge<K extends string>(
	...maps: [Record<K, string[]>, ...Record<K, string[]>[]]
): Record<K, string[]> {
	const [first] = maps

	return Object.fromEntries(
		(Object.keys(first) as K[]).map((k) => [k, maps.flatMap((m) => m[k])]),
	) as Record<K, string[]>
}
