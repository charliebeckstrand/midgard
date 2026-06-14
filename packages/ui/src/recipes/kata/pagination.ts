import { defineRecipe, type VariantProps } from '../../core/recipe'
import { hannou, iro, ji, kasane, kokkaku, narabi, sen } from '../kiso'

const { cursor, fg } = hannou
const { text } = iro
const { size, weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { focus } = sen

const list = defineRecipe({
	base: [flex.row, 'list-none', 'gap-1', 'm-0 p-0'],
})

const button = defineRecipe({
	base: [
		// `z-1` lifts the button above its sibling active indicator.
		'relative z-1',
		flex.inline,
		'justify-center',
		'min-w-9',
		'p-2',
		size.sm,
		weight.medium,
		rounded.lg,
		focus.ring,
		...cursor,
	],
	current: {
		true: [...text.default],
		false: [...text.muted, ...fg.hover],
	},
	defaults: { current: false },
})

const gap = defineRecipe({
	base: [flex.inline, 'justify-center', 'min-w-9', size.sm, ...text.muted, 'select-none'],
})

export const k = defineRecipe(
	{
		base: [flex.row, 'list-none', 'gap-1'],
		skeleton: kokkaku.pagination,
	},
	{
		list,
		pageButton: button,
		gap,
		/** Positioning wrapper around each page button; hosts the active indicator. */
		wrapper: 'group relative inline-flex',
	},
)

export type PageButtonVariants = VariantProps<typeof button>
