import { defineRecipe, iro, ji, type VariantPropsOf } from '..'

export const k = defineRecipe({
	base: [...iro.text.default],
	level: {
		1: ['font-bold', ji['3xl']],
		2: ['font-semibold', ji['2xl']],
		3: ['font-semibold', ji.xl],
		4: ['font-medium', ji.lg],
		5: ['font-medium', ji.md],
		6: ['font-medium', ji.sm],
	},
	defaults: { level: 1 },
})

export type HeadingVariants = VariantPropsOf<typeof k>
