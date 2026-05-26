import { defineRecipe, type VariantProps } from '../../core/recipe'
import { shaku } from '../kiso'
export const k = defineRecipe({
	base: ['inline-flex items-center justify-center', ...shaku.mark.base],
	size: shaku.mark.size,
	defaults: { size: 'md' },
})

export type KbdVariants = VariantProps<typeof k>
