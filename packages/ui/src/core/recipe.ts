/**
 * Generates compound-variant entries for a (variant × color) pair from a color map.
 *
 * `tv()` and `cva()` share the same `compoundVariants` shape, so this helper
 * replaces the `compoundColors` adapter that `color-cva.ts` used to supply.
 *
 * Pass `extra` to attach additional variant fields (e.g. `{ active: true }`)
 * to every generated entry.
 */
export function colorMatrix<V extends string, C extends string>(
	variant: V,
	map: Record<C, string | string[]>,
	extra: Record<string, unknown> = {},
) {
	return Object.entries(map).map(([color, cls]) => ({
		variant,
		color: color as C,
		class: cls as string | string[],
		...extra,
	}))
}
