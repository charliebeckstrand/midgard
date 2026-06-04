import { defineRecipe, type VariantProps } from '../../core/recipe'
import { ma, sen } from '../kiso'

const { border } = sen

const divider = defineRecipe({
	base: 'border-t col-span-full',
	soft: {
		true: [...border.subtleColor],
		false: [...border.defaultColor],
	},
	defaults: { soft: false },
})

export const k = { divider, gap: ma.gap }

export type GridDividerVariants = VariantProps<typeof divider>
