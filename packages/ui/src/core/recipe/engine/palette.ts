/**
 * definePalette(): declares a recipe's variant × color matrix.
 *
 * The matrix is keyed by variant and then by color. Each entry is the literal
 * class string of that variant in that color, light and dark classes
 * together, because Tailwind's scanner finds only whole class literals. A
 * synthetic color such as `inherit` is one more key of each variant.
 *
 * Lives on `RecipeConfig.palette` rather than on a variant axis: the
 * variant scaffold (`{ outline: 'ring-1 ring-inset', … }`) and the palette
 * matrix stay in separate fields with single responsibilities.
 */

import type { ClassValue } from 'clsx'

import type { Color } from '../colors'

import type { CompoundRule } from './types'

export type PaletteConfig<M extends string = string, C extends string = Color> = {
	matrix: Record<M, Record<C, ClassValue>>
}

export function definePalette<M extends string, C extends string = Color>(
	matrix: Record<M, Record<C, ClassValue>>,
): PaletteConfig<M, C> {
	return { matrix }
}

/** The palette's `variant → color → classes` lookup, in rule order. */
export type PalettePairs = Map<string, Map<string, ClassValue[]>>

/**
 * Expands a palette config into the implicit `color` axis + compound rules,
 * alongside the nested {@link PalettePairs} lookup the compiled call path
 * reads. The flat rules stay for `.config` introspection.
 *
 * The color set is derived from the keys of the matrix, not a fixed list. A
 * kata that writes the five standard colors expands over them, and a kata
 * that also writes the extended set picks it up.
 */
export function expandPalette(config: PaletteConfig): {
	colorScaffold: Record<string, ClassValue>
	compound: CompoundRule[]
	pairs: PalettePairs
} {
	const colorScaffold: Record<string, ClassValue> = {}

	const compound: CompoundRule[] = []

	const pairs: PalettePairs = new Map()

	for (const [variant, entry] of Object.entries(config.matrix)) {
		const colors = new Map<string, ClassValue[]>()

		pairs.set(variant, colors)

		for (const [color, classValue] of Object.entries<ClassValue>(entry)) {
			colorScaffold[color] = ''

			compound.push({ variant, color, class: classValue } as CompoundRule)

			colors.set(color, [classValue])
		}
	}

	return { colorScaffold, compound, pairs }
}
