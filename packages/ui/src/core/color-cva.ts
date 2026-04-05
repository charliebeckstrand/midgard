import { cva, type VariantProps } from 'class-variance-authority'

type ColorTokenValue = string | readonly (string | readonly string[])[]
type ColorTokenMap = Record<string, ColorTokenValue>
type MutableTokenMap = Record<string, string | string[]>

/**
 * Creates a standalone CVA with a single `color` variant dimension.
 *
 * Used by Checkbox, Radio, and Switch where color is the only variant.
 * Defaults to `color: 'zinc'` when no color is specified.
 */
export function colorCva(base: string | string[], tokenMap: ColorTokenMap) {
	return cva(base, {
		variants: { color: tokenMap as MutableTokenMap },
		defaultVariants: { color: 'zinc' },
	})
}

export type ColorCvaVariants = VariantProps<ReturnType<typeof colorCva>>

/**
 * Creates empty CVA variant entries from a nuri color token map.
 *
 * Eliminates the `Object.fromEntries(Object.keys(nuri.X).map(k => [k, '']))` ceremony.
 *
 * @example
 * ```ts
 * cva(base, {
 *   variants: { variant: { solid: [...] }, color: colorKeys(nuri.button) },
 * })
 * ```
 */
export function colorKeys<T extends ColorTokenMap>(tokenMap: T): { [K in keyof T]: '' } {
	return Object.fromEntries(Object.keys(tokenMap).map((k) => [k, ''])) as { [K in keyof T]: '' }
}

/**
 * Generates CVA compound variant entries from nuri color token maps.
 *
 * @example
 * ```ts
 * // Single variant × color
 * compoundVariants: compoundColors('solid', nuri.button)
 *
 * // Multiple variants × color
 * compoundVariants: compoundColors({ solid: nuri.badgeSolid, soft: nuri.badgeSoft })
 * ```
 */
export function compoundColors<V extends string, C extends string>(
	variant: V,
	tokenMap: Record<C, ColorTokenValue>,
): { variant: V; color: C; className: string | string[] }[]

export function compoundColors<V extends string, C extends string>(
	mapping: Record<V, Record<C, ColorTokenValue>>,
): { variant: V; color: C; className: string | string[] }[]

export function compoundColors(
	variantOrMap: string | Record<string, Record<string, ColorTokenValue>>,
	tokenMap?: Record<string, ColorTokenValue>,
) {
	if (typeof variantOrMap === 'string' && tokenMap) {
		return Object.entries(tokenMap).map(([color, classes]) => ({
			variant: variantOrMap,
			color,
			className: classes as string | string[],
		}))
	}

	const mapping = variantOrMap as Record<string, Record<string, ColorTokenValue>>
	return Object.entries(mapping).flatMap(([variant, map]) =>
		Object.entries(map).map(([color, classes]) => ({
			variant,
			color,
			className: classes as string | string[],
		})),
	)
}
