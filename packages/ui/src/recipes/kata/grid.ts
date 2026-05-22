import { defineRecipe, type VariantPropsOf } from '../../core/recipe'
import { sen } from '../kiso'

const divider = defineRecipe({
	base: 'border-t col-span-full',
	soft: {
		true: [...sen.borderSubtleColor],
		false: [...sen.borderColor],
	},
	defaults: { soft: false },
})

export const k = { divider }

export type GridDividerVariants = VariantPropsOf<typeof divider>
