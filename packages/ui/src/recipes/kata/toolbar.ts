import { defineRecipe, type VariantProps } from '../../core/recipe'
import { kasane, narabi, omote, sen } from '../kiso'

const { radius } = kasane
const { flex } = narabi
const { bg } = omote
const { border } = sen

const root = defineRecipe({
	base: flex.row,
	orientation: {
		horizontal: 'flex-row flex-wrap gap-1',
		vertical: 'flex-col w-fit gap-1',
	},
	variant: {
		plain: '',
		outline: [...border.default, radius.rounded.lg, 'p-1'],
		solid: [...bg.tint, 'border border-transparent', radius.rounded.lg, 'p-1'],
	},
	defaults: { orientation: 'horizontal', variant: 'plain' },
})

const group = defineRecipe({
	base: flex.row,
	orientation: {
		horizontal: 'flex-row gap-0.5',
		vertical: 'flex-col gap-0.5',
	},
	defaults: { orientation: 'horizontal' },
})

export const k = {
	root,
	group,
} as const

export type ToolbarVariants = VariantProps<typeof root>
export type ToolbarGroupVariants = VariantProps<typeof group>
