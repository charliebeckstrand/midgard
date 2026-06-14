import type { Color } from '../../core/recipe'

/** One palette slot: a class list per colour. Generic over the colour set. */
type Slot<C extends string = Color> = Record<C, string[]>

/** The iro palette slots every chromatic surface shares. */
type ChromaticPalette<C extends string = Color> = {
	solid: { bg: Slot<C>; text: Slot<C> }
	soft: { bg: Slot<C>; text: Slot<C> }
	outline: { ring: Slot<C>; text: Slot<C> }
}

/**
 * Bundle the shared solid / soft / outline iro slots into the palette matrix
 * the chromatic surface kata (alert, badge, avatar) hand to `definePalette`.
 * `plain` is absent; avatar has no plain variant. Surfaces with a plain
 * variant spread `plain: palette.plain.text` into their own matrix.
 *
 * Generic over the colour set: handed the standard `iro.palette` it returns
 * the five-colour matrix; handed `iro.spectrum` it carries the extended keys
 * through, widening the kata's `color` axis (Badge).
 */
export function basePalette<C extends string = Color>(
	palette: ChromaticPalette<C>,
): Record<'solid' | 'soft' | 'outline', Slot<C>[]> {
	return {
		solid: [palette.solid.bg, palette.solid.text],
		soft: [palette.soft.bg, palette.soft.text],
		outline: [palette.outline.ring, palette.outline.text],
	}
}
