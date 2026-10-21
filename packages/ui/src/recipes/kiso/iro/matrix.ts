/**
 * Iro matrix: the solid, soft, and outline slots of a palette, in the form
 * that `definePalette` takes. The chromatic surfaces (alert, badge, avatar)
 * read it. `plain` is absent, because avatar has no plain variant. A surface
 * with a plain variant adds `plain: palette.plain.text` to its own matrix.
 *
 * The lists are readonly, so `definePalette` infers the color set from them.
 * A mutable list also matches the single-record form of an entry, and the
 * color axis of the kata then widens to `string`.
 *
 * Layer: kiso · Concern: palette matrix
 */

import type { Color } from '../../../core/recipe'

/** One palette slot: a class list per color. */
type Slot<C extends string> = Record<C, string[]>

/** The palette slots that each chromatic surface shares. */
type Chromatic<C extends string> = {
	solid: { bg: Slot<C>; text: Slot<C> }
	soft: { bg: Slot<C>; text: Slot<C> }
	outline: { ring: Slot<C>; text: Slot<C> }
}

/** Puts the solid, soft, and outline slots of a palette in the matrix form. */
export function matrix<C extends string = Color>(
	t: Chromatic<C>,
): Record<'solid' | 'soft' | 'outline', readonly Slot<C>[]> {
	return {
		solid: [t.solid.bg, t.solid.text],
		soft: [t.soft.bg, t.soft.text],
		outline: [t.outline.ring, t.outline.text],
	}
}
