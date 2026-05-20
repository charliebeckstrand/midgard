import { defineRecipe, iro, ji, narabi, sawari, sen, type VariantPropsOf } from '../../core/recipe'

const item = defineRecipe({
	base: ['group/option flex w-full items-center', ...sawari.item, ...narabi.item],
	size: {
		sm: ['gap-2 px-2.5 py-1', ji.size.sm],
		md: ['gap-3 px-3 py-1.5', ji.size.md],
		lg: ['gap-3 px-3.5 py-2.5', ji.size.lg],
	},
	defaults: { size: 'md' },
})

export const k = {
	content: ['min-w-48', 'max-h-60'],
	item,
	section: 'first:pt-0 last:pb-0',
	heading: ['px-3 pb-1 pt-2', 'text-xs font-medium', iro.text.muted],
	label: 'truncate',
	description: [narabi.description, iro.text.muted, 'group-focus/option:text-white'],
	shortcut: 'ml-auto',
	separator: sen.divider,
}

export type MenuItemVariants = VariantPropsOf<typeof item>
