import { defineRecipe, type VariantProps } from '../../core/recipe'
import { kasane, narabi, sen } from '../kiso'

export const k = defineRecipe({
	base: [narabi.row, 'gap-4', 'overflow-x-auto', 'px-4 py-2.5', kasane.radius.rounded.lg, 'border'],
	variant: {
		outline: [...sen.border.color],
		plain: [...sen.border.transparent],
	},
	defaults: { variant: 'outline' },
})

export type NavbarVariants = VariantProps<typeof k>
