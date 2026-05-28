import { defineRecipe, type VariantProps } from '../../core/recipe'
import { iro, ji, kokkaku } from '../kiso'

export const k = defineRecipe({
	base: [...iro.text.default],
	level: {
		1: [ji.weight.bold, ji['3xl']],
		2: [ji.weight.semibold, ji['2xl']],
		3: [ji.weight.semibold, ji.xl],
		4: [ji.weight.medium, ji.lg],
		5: [ji.weight.medium, ji.md],
		6: [ji.weight.medium, ji.sm],
	},
	defaults: { level: 1 },
	skeleton: kokkaku.heading,
})

export type HeadingVariants = VariantProps<typeof k>
