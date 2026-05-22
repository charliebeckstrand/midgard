import { defineRecipe, type VariantPropsOf } from '../../core/recipe'
import { sen } from '../kiso'
export const k = defineRecipe({
	base: ['flex items-center gap-4', 'overflow-x-auto', 'px-4 py-2.5', 'rounded-lg', 'border'],
	variant: {
		outline: [...sen.borderColor],
		plain: [...sen.borderTransparent],
	},
	defaults: { variant: 'outline' },
})

export type NavbarVariants = VariantPropsOf<typeof k>
