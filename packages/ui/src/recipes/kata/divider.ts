import { defineRecipe, type VariantProps } from '../../core/recipe'
import { sen } from '../kiso'
export const k = defineRecipe({
	base: ['border-0'],
	orientation: {
		horizontal: 'w-full border-t',
		vertical: 'self-stretch border-l',
	},
	soft: {
		true: [...sen.borderSubtleColor],
		false: [...sen.borderColor],
	},
	defaults: { orientation: 'horizontal', soft: false },
})

export type DividerVariants = VariantProps<typeof k>
