import { defineRecipe, type VariantProps } from '../../core/recipe'
import { shaku } from '../kiso'

const { mark } = shaku

export const k = defineRecipe({
	base: ['inline-flex items-center justify-center', ...mark.base],
	size: mark.size,
	defaults: { size: 'md' },
})

export type KbdVariants = VariantProps<typeof k>
