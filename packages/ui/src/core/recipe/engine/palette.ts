/**
 * palette() — declares a recipe's colour × variant matrix.
 *
 * First argument: the palette matrix. Each entry is one of two shapes:
 *
 *   1. `Record<Color, string[]>` — a single per-colour data record. Pass
 *      e.g. `iro.palette.plain.text` directly when a variant only needs one
 *      slot's data.
 *
 *   2. `readonly Record<Color, string[]>[]` — an array of records the engine
 *      merges per colour. Pass e.g. `[solid.bg, solid.text, solid.hover]` to
 *      bundle several iro.palette slots into one variant.
 *
 * Subsequent arguments: per-colour overlays. Each is a `{ color → class }`
 * map that applies the same classes to every variant in the matrix. Used
 * for non-palette colour values such as `inherit`. Multiple overlay objects
 * are merged left-to-right.
 *
 * The result is stored on `RecipeConfig.palette` (not on a variant axis) so
 * the variant scaffold (`{ outline: 'ring-1 ring-inset', … }`) and the
 * palette participation matrix stay in separate fields with single
 * responsibilities.
 */

import type { ClassValue } from 'clsx'

import { type Color, colors as colorList } from '../../../recipes/kiso/colors'

import type { CompoundRule } from './types'

export type PaletteEntry = Record<Color, string[]> | readonly Record<Color, string[]>[]

export type PaletteConfig<E extends string = never, M extends string = string> = {
	matrix: Record<M, PaletteEntry>
	overlays: Record<E, ClassValue>
}

export function palette<M extends string, E extends string = never>(
	matrix: Record<M, PaletteEntry>,
	...overlays: Record<E, ClassValue>[]
): PaletteConfig<E, M> {
	const merged: Record<string, ClassValue> = {}

	for (const layer of overlays) Object.assign(merged, layer)

	return { matrix, overlays: merged as Record<E, ClassValue> }
}

/** Expands a palette config into the implicit `color` axis + compound rules. */
export function expandPalette(config: PaletteConfig): {
	colorScaffold: Record<string, ClassValue>
	compound: CompoundRule[]
} {
	const colorScaffold: Record<string, ClassValue> = {}

	for (const c of colorList) colorScaffold[c] = ''

	for (const extra of Object.keys(config.overlays)) colorScaffold[extra] = ''

	const compound: CompoundRule[] = []

	for (const [variant, entry] of Object.entries(config.matrix)) {
		const perColor = resolveEntry(entry)

		for (const color of colorList) {
			compound.push({ variant, color, class: perColor[color] } as CompoundRule)
		}

		for (const [extraColor, classValue] of Object.entries(config.overlays)) {
			compound.push({ variant, color: extraColor, class: classValue } as CompoundRule)
		}
	}

	return { colorScaffold, compound }
}

function isPaletteData(entry: PaletteEntry): entry is Record<Color, string[]> {
	return !Array.isArray(entry)
}

function resolveEntry(entry: PaletteEntry): Record<Color, string[]> {
	if (isPaletteData(entry)) return entry

	const out = {} as Record<Color, string[]>

	for (const color of colorList) {
		const classes: string[] = []

		for (const record of entry) classes.push(...record[color])

		out[color] = classes
	}

	return out
}
