/**
 * Concatenates per-key class records into one. Used when a kata needs a
 * pre-merged variant × colour bundle outside the engine's compound expansion
 * — e.g. calendar reading button's soft palette for the selected-cell
 * colour.
 *
 * @example
 *   const { soft } = iro.palette
 *   const buttonSoft = merge(soft.bg, soft.text, soft.hover)
 *   // buttonSoft.blue holds the merged blue classes from all three slots.
 */

export function merge<K extends string>(
	...maps: [Record<K, string[]>, ...Record<K, string[]>[]]
): Record<K, string[]> {
	const [first] = maps

	return Object.fromEntries(
		(Object.keys(first) as K[]).map((k) => [k, maps.flatMap((m) => m[k])]),
	) as Record<K, string[]>
}
