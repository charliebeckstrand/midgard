import { defineRecipe, take, type VariantPropsOf } from '../../core/recipe'

export const k = defineRecipe({
	base: ['inline-flex items-center justify-center', ...take.mark.base],
	size: take.mark.size,
	defaults: { size: 'md' },
})

export type KbdVariants = VariantPropsOf<typeof k>
