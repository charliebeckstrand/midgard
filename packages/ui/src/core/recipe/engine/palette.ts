/**
 * definePalette(): declares a recipe's colour × variant matrix.
 *
 * First argument: the matrix. Each entry takes one of two shapes:
 *
 *   1. `Record<Color, string[]>`: a single per-colour record. Pass
 *      `iro.palette.plain.text` directly when a variant pulls from one
 *      slot.
 *   2. `readonly Record<Color, string[]>[]`: an array of records merged
 *      per colour. Pass `[solid.bg, solid.text, solid.hover]` to bundle
 *      several iro.palette slots into one variant.
 *
 * Subsequent arguments: per-colour overlays. Each `{ color → class }` map
 * applies its classes to every variant in the matrix; covers non-palette
 * colour values like `inherit`. Multiple overlays merge left-to-right.
 *
 * Lives on `RecipeConfig.palette` rather than on a variant axis: the
 * variant scaffold (`{ outline: 'ring-1 ring-inset', … }`) and the palette
 * matrix stay in separate fields with single responsibilities.
 */

import type { ClassValue } from 'clsx'

import type { Color } from '../colors'

import type { CompoundRule } from './types'

export type PaletteEntry<C extends string = Color> =
	| Record<C, string[]>
	| readonly Record<C, string[]>[]

export type PaletteConfig<
	E extends string = never,
	M extends string = string,
	C extends string = Color,
> = {
	matrix: Record<M, PaletteEntry<C>>
	overlays: Record<E, ClassValue>
}

export function definePalette<M extends string, E extends string = never, C extends string = Color>(
	matrix: Record<M, PaletteEntry<C>>,
	...overlays: Record<E, ClassValue>[]
): PaletteConfig<E, M, C> {
	const merged: Record<string, ClassValue> = {}

	for (const layer of overlays) Object.assign(merged, layer)

	return { matrix, overlays: merged as Record<E, ClassValue> }
}

/**
 * Expands a palette config into the implicit `color` axis + compound rules.
 *
 * The colour set is derived from the keys of the matrix's own entries, not a
 * fixed list: a kata reading the standard `iro.palette` expands over the five
 * standard colours, while one reading `iro.spectrum` also picks up the
 * extended set. Overlay keys (synthetic values like `inherit`) join the axis
 * with a single class shared across every variant.
 */
export function expandPalette(config: PaletteConfig): {
	colorScaffold: Record<string, ClassValue>
	compound: CompoundRule[]
} {
	const colorScaffold: Record<string, ClassValue> = {}

	const compound: CompoundRule[] = []

	for (const [variant, entry] of Object.entries(config.matrix)) {
		const perColor = resolveEntry(entry)

		for (const [color, classValue] of Object.entries(perColor)) {
			colorScaffold[color] = ''

			compound.push({ variant, color, class: classValue } as CompoundRule)
		}

		for (const [extraColor, classValue] of Object.entries(config.overlays)) {
			colorScaffold[extraColor] = ''

			compound.push({ variant, color: extraColor, class: classValue } as CompoundRule)
		}
	}

	return { colorScaffold, compound }
}

/** Resolves a matrix entry to a per-colour class map, merging array entries by colour key. */
function resolveEntry(entry: PaletteEntry): Record<string, string[]> {
	if (!Array.isArray(entry)) return entry as Record<string, string[]>

	const out: Record<string, string[]> = {}

	for (const record of entry as readonly Record<string, string[]>[]) {
		for (const color of Object.keys(record)) {
			out[color] = [...(out[color] ?? []), ...(record[color] ?? [])]
		}
	}

	return out
}
