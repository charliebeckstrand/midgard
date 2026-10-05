/**
 * Palette bridge: the solid / soft / outline matrix that the chromatic surface
 * kata share. A pure bridge: it receives an `iro` palette from the calling
 * kata, and it references kiso in neither value nor type.
 */

import type { Color } from '../../core/recipe'

/** One palette slot: a class list per color. Generic over the color set. */
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
 * Generic over the color set: handed the standard `iro.palette` it returns
 * the five-color matrix. Handed `iro.extended` it carries the extended keys
 * through, which widens the kata's `color` axis (Badge).
 *
 * The lists are readonly, so `definePalette` infers the color set from them.
 * A mutable list also matches the single-record form of an entry, and the
 * color axis of the kata then widens to `string`.
 */
export function palette<C extends string = Color>(
	t: ChromaticPalette<C>,
): Record<'solid' | 'soft' | 'outline', readonly Slot<C>[]> {
	return {
		solid: [t.solid.bg, t.solid.text],
		soft: [t.soft.bg, t.soft.text],
		outline: [t.outline.ring, t.outline.text],
	}
}
