/**
 * palette() — declares a recipe's colour × variant matrix.
 *
 * First argument: the matrix. Each entry takes one of two shapes:
 *
 *   1. `Record<Color, string[]>` — a single per-colour record. Pass
 *      `iro.palette.plain.text` directly when a variant pulls from one
 *      slot.
 *   2. `readonly Record<Color, string[]>[]` — an array of records merged
 *      per colour. Pass `[solid.bg, solid.text, solid.hover]` to bundle
 *      several iro.palette slots into one variant.
 *
 * Subsequent arguments: per-colour overlays. Each `{ color → class }` map
 * applies its classes to every variant in the matrix — used for non-palette
 * colour values like `inherit`. Multiple overlays merge left-to-right.
 *
 * Stored on `RecipeConfig.palette` rather than on a variant axis: the
 * variant scaffold (`{ outline: 'ring-1 ring-inset', … }`) and the palette
 * matrix stay in separate fields with single responsibilities.
 */

import type { ClassValue } from 'clsx'

import { type Color, colors as colorList } from '../colors'

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
