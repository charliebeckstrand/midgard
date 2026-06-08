import { defineRecipe } from '../../core/recipe'
import { hannou, iro, ji, narabi, sen } from '../kiso'

const { text } = iro
const { size, weight } = ji
const { flex, description } = narabi
const { divider } = sen

const item = defineRecipe({
	base: ['group/option', flex.row, 'w-full', ...hannou.item, ...narabi.item],
	// Padding and gap track the density axis; text tracks the size axis.
	// They move together under a diagonal `<Density>` and split when the axes
	// are set independently.
	density: {
		sm: 'gap-2 px-2.5 py-1',
		md: 'gap-3 px-3 py-1.5',
		lg: 'gap-3 px-3.5 py-2.5',
	},
	size: {
		sm: size.sm,
		md: size.md,
		lg: size.lg,
	},
	defaults: { density: 'md', size: 'md' },
})

export const k = {
	content: ['min-w-48', 'max-h-60'],
	item,
	section: 'first:pt-0 last:pb-0',
	heading: ['px-3 pb-1 pt-2', size.xs, weight.medium, text.muted],
	label: 'truncate',
	description: [description, text.muted, 'group-focus/option:text-white'],
	shortcut: 'ml-auto',
	separator: divider.top,
} as const
