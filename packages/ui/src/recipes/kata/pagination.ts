import { defineRecipe, type VariantProps } from '../../core/recipe'
import { hannou, iro, ji, kasane, narabi, sen } from '../kiso'

const list = defineRecipe({
	base: [narabi.flex.row, 'list-none', 'gap-1', 'm-0 p-0'],
})

const button = defineRecipe({
	base: [
		'relative',
		narabi.flex.inline,
		'justify-center',
		'min-w-9',
		'p-2',
		ji.size.sm,
		ji.weight.medium,
		kasane.radius.rounded.lg,
		sen.focus.ring,
		...hannou.cursor,
	],
	current: {
		true: [...iro.text.default],
		false: [...iro.text.muted, ...hannou.text.hover],
	},
	defaults: { current: false },
})

const gap = defineRecipe({
	base: [
		narabi.flex.inline,
		'justify-center',
		'min-w-9',
		ji.size.sm,
		...iro.text.muted,
		'select-none',
	],
})

export const k = defineRecipe(
	{
		base: [narabi.flex.row, 'list-none', 'gap-1'],
	},
	{
		list,
		pageButton: button,
		gap,
	},
)

export type PageButtonVariants = VariantProps<typeof button>
