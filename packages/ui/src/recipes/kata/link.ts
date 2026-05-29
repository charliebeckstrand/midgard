import { defineRecipe, type VariantProps } from '../../core/recipe'
import { iro } from '../kiso'

const { palette } = iro

export const k = defineRecipe({
	color: {
		...palette.bare.text,
		current: 'text-current dark:text-current',
	},
	underline: {
		true: 'hover:underline underline-offset-4',
		false: '',
	},
	defaults: { color: 'current', underline: false },
})

export type LinkVariants = VariantProps<typeof k>
