/**
 * Generates CVA compound variant entries from a nuri color token map.
 *
 * Used by Button (solid × color) and Badge (solid × color, soft × color)
 * to avoid hand-enumerating every color.
 *
 * @example
 * ```ts
 * compoundColorVariants('solid', nuri.button)
 * // → [{ variant: 'solid', color: 'zinc', className: nuri.button.zinc }, ...]
 * ```
 */
export function compoundColorVariants<V extends string, C extends string>(
	variant: V,
	tokenMap: Record<C, string | readonly string[]>,
) {
	return (Object.entries(tokenMap) as [C, string | readonly string[]][]).map(
		([color, classes]) => ({
			variant,
			color,
			className: classes as string | string[],
		}),
	)
}
