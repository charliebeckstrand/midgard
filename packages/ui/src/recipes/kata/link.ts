import { defineRecipe, type VariantProps } from '../../core/recipe'
import { iro } from '../kiso'

export const k = defineRecipe({
	color: {
		...iro.palette.bare.text,
		current: 'text-current dark:text-current',
	},
	underline: {
		true: 'hover:underline underline-offset-4',
		false: '',
	},
	defaults: { color: 'blue', underline: true },
})

export type LinkVariants = VariantProps<typeof k>
