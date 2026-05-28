import { defineRecipe, mode } from '../../core/recipe'
import { hannou, iro, ji, kasane, narabi, sen, ugoki } from '../kiso'

export type TreeSize = 'sm' | 'md' | 'lg'

const itemContent = defineRecipe(
	{
		base: [
			narabi.row,
			'w-full',
			'py-1 px-2',
			'gap-2',
			iro.text.muted,
			hannou.text.hover,
			kasane.radius.rounded.lg,
			sen.focus.inset,
			...hannou.cursor,
			'select-none',
			...mode('data-[open]:text-zinc-950', 'dark:data-[open]:text-white'),
		],
		size: {
			sm: ji.size.sm,
			md: ji.size.md,
			lg: ji.size.lg,
		},
		defaults: { size: 'md' },
	},
	{ current: iro.text.default },
)

const chevron = defineRecipe({
	base: ['flex-none', narabi.row, 'justify-center', ugoki.css.transform, ugoki.css.duration],
	size: {
		sm: 'w-4',
		md: 'w-5',
		lg: 'w-6',
	},
	defaults: { size: 'md' },
})

export const k = {
	base: [
		narabi.col,
		// Trim outer vertical padding on the edge rows so the tree sits flush with its container.
		'[&>[data-slot=tree-item]:first-child>[role=treeitem]]:pt-0',
		'[&>[data-slot=tree-item]:last-child>[role=treeitem]]:pb-0',
	],
	item: [],
	itemContent,
	chevron,
	label: 'flex-1 truncate text-left',
	group: 'overflow-hidden',
	/** Per-depth indent in rem when `indent` is enabled. Equals chevron width + row gap. */
	indentStep: {
		sm: 1.5,
		md: 1.75,
		lg: 2,
	},
	motion: ugoki.collapse.fade,
} as const
