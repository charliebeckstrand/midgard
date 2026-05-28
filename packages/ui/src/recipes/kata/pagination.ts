import { defineRecipe, type VariantProps } from '../../core/recipe'
import { hannou, iro, ji, kasane, narabi, sen } from '../kiso'

const { cursor } = hannou
const { text } = iro
const { size, weight } = ji
const { radius } = kasane
const { flex } = narabi
const { focus } = sen

const list = defineRecipe({
	base: [flex.row, 'list-none', 'gap-1', 'm-0 p-0'],
})

const button = defineRecipe({
	base: [
		'relative',
		flex.inline,
		'justify-center',
		'min-w-9',
		'p-2',
		size.sm,
		weight.medium,
		radius.rounded.lg,
		focus.ring,
		...cursor,
	],
	current: {
		true: [...text.default],
		false: [...text.muted, ...hannou.text.hover],
	},
	defaults: { current: false },
})

const gap = defineRecipe({
	base: [flex.inline, 'justify-center', 'min-w-9', size.sm, ...text.muted, 'select-none'],
})

export const k = defineRecipe(
	{
		base: [flex.row, 'list-none', 'gap-1'],
	},
	{
		list,
		pageButton: button,
		gap,
	},
)

export type PageButtonVariants = VariantProps<typeof button>
