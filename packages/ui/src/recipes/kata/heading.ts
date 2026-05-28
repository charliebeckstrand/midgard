import { defineRecipe, type VariantProps } from '../../core/recipe'
import { iro, ji, kokkaku } from '../kiso'

const { text } = iro
const { size, weight } = ji

export const k = defineRecipe({
	base: [...text.default],
	level: {
		1: [weight.bold, size['3xl']],
		2: [weight.semibold, size['2xl']],
		3: [weight.semibold, size.xl],
		4: [weight.medium, size.lg],
		5: [weight.medium, size.md],
		6: [weight.medium, size.sm],
	},
	defaults: { level: 1 },
	skeleton: kokkaku.heading,
})

export type HeadingVariants = VariantProps<typeof k>
