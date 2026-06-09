import type { Color } from '../../core/recipe'

/** One palette slot — a class list per colour. */
type Slot = Record<Color, string[]>

/** The iro palette slots every chromatic surface shares. */
type ChromaticPalette = {
	solid: { bg: Slot; text: Slot }
	soft: { bg: Slot; text: Slot }
	outline: { ring: Slot; text: Slot }
}

/**
 * Bundle the shared solid / soft / outline iro slots into the palette matrix
 * the chromatic surface kata (alert, badge, avatar) hand to `definePalette`.
 * `plain` is deliberately absent — avatar has no plain variant — so the
 * surfaces that do spread `plain: palette.plain.text` into their own matrix.
 */
export function basePalette(
	palette: ChromaticPalette,
): Record<'solid' | 'soft' | 'outline', Slot[]> {
	return {
		solid: [palette.solid.bg, palette.solid.text],
		soft: [palette.soft.bg, palette.soft.text],
		outline: [palette.outline.ring, palette.outline.text],
	}
}
