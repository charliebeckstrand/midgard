import { defineRecipe, sen, type VariantPropsOf } from '../../core/recipe'

const divider = defineRecipe({
	base: 'border-t col-span-full',
	soft: {
		true: [...sen.borderSubtleColor],
		false: [...sen.borderColor],
	},
	defaults: { soft: false },
})

/** Kept for the `kata` barrel — not consumed directly. */
export const k = { divider }

export type GridDividerVariants = VariantPropsOf<typeof divider>
