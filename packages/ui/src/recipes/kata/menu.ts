import { defineRecipe } from '../../core/recipe'
import { hannou, iro, ji, narabi, sen } from '../kiso'

const item = defineRecipe({
	base: ['group/option', narabi.row, 'w-full', ...hannou.item, ...narabi.item],
	size: {
		sm: ['gap-2 px-2.5 py-1', ji.sm],
		md: ['gap-3 px-3 py-1.5', ji.md],
		lg: ['gap-3 px-3.5 py-2.5', ji.lg],
	},
	defaults: { size: 'md' },
})

export const k = {
	content: ['min-w-48', 'max-h-60'],
	item,
	section: 'first:pt-0 last:pb-0',
	heading: ['px-3 pb-1 pt-2', ji.xs, ji.weight.medium, iro.text.muted],
	label: 'truncate',
	description: [narabi.description, iro.text.muted, 'group-focus/option:text-white'],
	shortcut: 'ml-auto',
	separator: sen.divider.top,
} as const
