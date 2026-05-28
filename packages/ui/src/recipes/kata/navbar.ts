import { defineRecipe, type VariantProps } from '../../core/recipe'
import { kasane, narabi, sen } from '../kiso'

const { radius } = kasane
const { flex } = narabi
const { border } = sen

export const k = defineRecipe({
	base: [flex.row, 'gap-4', 'overflow-x-auto', 'px-4 py-2.5', radius.rounded.lg, 'border'],
	variant: {
		outline: [...border.color],
		plain: [...border.transparent],
	},
	defaults: { variant: 'outline' },
})

export type NavbarVariants = VariantProps<typeof k>
