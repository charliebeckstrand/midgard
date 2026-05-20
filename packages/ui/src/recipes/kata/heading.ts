import { defineRecipe, iro, ji, type VariantPropsOf } from '..'

export const k = defineRecipe({
	base: [...iro.text.default],
	level: {
		1: ['font-bold', ji.size['3xl']],
		2: ['font-semibold', ji.size['2xl']],
		3: ['font-semibold', ji.size.xl],
		4: ['font-medium', ji.size.lg],
		5: ['font-medium', ji.size.md],
		6: ['font-medium', ji.size.sm],
	},
	defaults: { level: 1 },
})

export type HeadingVariants = VariantPropsOf<typeof k>
