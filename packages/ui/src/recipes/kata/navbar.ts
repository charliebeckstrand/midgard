import { defineRecipe, type VariantProps } from '../../core/recipe'
import { sen } from '../kiso'
export const k = defineRecipe({
	base: ['flex items-center gap-4', 'overflow-x-auto', 'px-4 py-2.5', 'rounded-lg', 'border'],
	variant: {
		outline: [...sen.border.color],
		plain: [...sen.border.transparent],
	},
	defaults: { variant: 'outline' },
})

export type NavbarVariants = VariantProps<typeof k>
