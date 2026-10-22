/**
 * definePalette(): declares a recipe's variant × color matrix.
 *
 * A matrix is keyed by variant and then by color. Each entry is the literal
 * class string of that variant in that color, light and dark classes
 * together, because Tailwind's scanner finds only whole class literals.
 *
 * A kata can pass more than one matrix. The cells of the same variant and
 * color join in the order of the matrices, so Button passes the colors at
 * rest, then the hover, then its own `inherit` entries. A key that only one
 * matrix writes, such as `inherit`, is one more key of the merged matrix.
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

type Matrix = { readonly [variant: string]: { readonly [color: string]: ClassValue } }

/** The variants of the matrices. */
type Variants<T extends readonly Matrix[]> = keyof T[number] & string

/** The colors of the matrices: each key of each variant of each matrix. */
type Colors<T extends readonly Matrix[]> = T[number] extends infer X
	? X extends Matrix
		? { [V in keyof X]: keyof X[V] }[keyof X] & string
		: never
	: never

export function definePalette<const T extends readonly Matrix[]>(
	...matrices: T
): PaletteConfig<Variants<T>, Colors<T>> {
	const matrix: Record<string, Record<string, ClassValue[]>> = {}

	for (const each of matrices) {
		for (const [variant, entry] of Object.entries(each)) {
			matrix[variant] ??= {}

			const cells = matrix[variant]

			for (const [color, classValue] of Object.entries(entry)) {
				cells[color] = [...(cells[color] ?? []), classValue]
			}
		}
	}

	return { matrix } as PaletteConfig<Variants<T>, Colors<T>>
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
