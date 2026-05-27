import { defineRecipe, type VariantProps } from '../../core/recipe'
import { iro } from '../kiso'

export const k = defineRecipe({
	color: {
		...iro.palette.bare.text,
		current: 'text-current dark:text-current',
	},
	defaults: { color: 'blue' },
})

export type LinkVariants = VariantProps<typeof k>
