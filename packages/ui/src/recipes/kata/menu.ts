import { defineRecipe } from '../../core/recipe'
import { hannou, iro, ji, narabi, sen } from '../kiso'

const { text } = iro
const { size, weight } = ji
const { flex, description } = narabi
const { divider } = sen

const item = defineRecipe({
	base: ['group/option', flex.row, 'w-full', ...hannou.item, ...narabi.item],
	size: {
		sm: ['gap-2 px-2.5 py-1', size.sm],
		md: ['gap-3 px-3 py-1.5', size.md],
		lg: ['gap-3 px-3.5 py-2.5', size.lg],
	},
	defaults: { size: 'md' },
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
