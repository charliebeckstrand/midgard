import { defineRecipe, shaku, type VariantPropsOf } from '..'

export const k = defineRecipe({
	base: ['inline-flex items-center justify-center', ...shaku.mark.base],
	size: shaku.mark.size,
	defaults: { size: 'md' },
})

export type KbdVariants = VariantPropsOf<typeof k>
