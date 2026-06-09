import { type Color, definePalette, type PaletteConfig } from '../../core/recipe'

/** One palette slot — a class list per colour. */
type Slot = Record<Color, string[]>

/**
 * The iro palette slots a chromatic surface bundles into its variant axis.
 * Declared as the bridge's own contract; the kata injects `iro.palette`.
 */
type ChromaticPalette = {
	solid: { bg: Slot; text: Slot }
	soft: { bg: Slot; text: Slot }
	outline: { ring: Slot; text: Slot }
	plain: { text: Slot }
}

/** Variant keys, less `plain` when the surface opts out of it. */
type BaseVariants<Plain extends boolean> =
	| 'solid'
	| 'soft'
	| 'outline'
	| (Plain extends false ? never : 'plain')

/**
 * The solid / soft / outline / plain matrix shared by the chromatic surface
 * kata (alert, badge, avatar): each variant bundles its iro slots into one
 * palette entry. Pass `{ plain: false }` for surfaces with no plain variant
 * (avatar), which drops the key so the kata's variant union stays exact.
 */
export function basePalette<Plain extends boolean = true>(
	palette: ChromaticPalette,
	options?: { plain?: Plain },
): PaletteConfig<never, BaseVariants<Plain>> {
	const matrix = {
		solid: [palette.solid.bg, palette.solid.text],
		soft: [palette.soft.bg, palette.soft.text],
		outline: [palette.outline.ring, palette.outline.text],
	}

	const config =
		options?.plain === false
			? definePalette(matrix)
			: definePalette({ ...matrix, plain: palette.plain.text })

	return config as PaletteConfig<never, BaseVariants<Plain>>
}
