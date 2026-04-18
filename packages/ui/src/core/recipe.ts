/**
 * Generates compound-variant entries for a (variant × color) pair from a color map.
 *
 * `tv()` and `cva()` share the same `compoundVariants` shape, so this helper
 * replaces the `compoundColors` adapter that `color-cva.ts` used to supply.
 */
export function colorMatrix<V extends string, C extends string>(
	variant: V,
	map: Record<C, string | string[]>,
): { variant: V; color: C; class: string | string[] }[] {
	return Object.entries(map).map(([color, cls]) => ({
		variant,
		color: color as C,
		class: cls as string | string[],
	}))
}
