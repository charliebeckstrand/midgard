/**
 * Tree kata: object-literal surface for the `<Tree>` treeview. Size-axed
 * sub-recipes carry the `item.content` row and its `chevron`; the static slots
 * cover the `base` container, `item.base`, `affix`, `label`, and `group`. The
 * `indentStep` map sets per-depth indent in rem, and `motion` is the collapse
 * transition.
 */
import { defineRecipe, mode } from '../../core/recipe'
import { hannou, iro, ji, kasane, narabi, sen, ugoki } from '../kiso'

const { cursor, fg } = hannou
const { text } = iro
const { size } = ji
const { rounded } = kasane
const { flex } = narabi
const { focus } = sen
const { css, collapse } = ugoki

export type TreeSize = 'sm' | 'md' | 'lg'

const itemContent = defineRecipe(
	{
		base: [
			flex.row,
			'w-full',
			'py-1 px-2',
			'gap-2',
			text.muted,
			fg.hover,
			rounded.lg,
			focus.inset,
			...cursor,
			'select-none',
			...mode('data-[open]:text-zinc-950', 'dark:data-[open]:text-white'),
		],
		size: {
			sm: size.sm,
			md: size.md,
			lg: size.lg,
		},
		defaults: { size: 'md' },
	},
	{ current: text.default },
)

const chevron = defineRecipe({
	base: ['flex-none', flex.row, 'justify-center', css.transform, css.duration],
	size: {
		sm: 'w-4',
		md: 'w-5',
		lg: 'w-6',
	},
	defaults: { size: 'md' },
})

export const k = {
	base: [
		flex.col,
		// Trims outer vertical padding on edge rows, flushing the tree with its container.
		'[&>[data-slot=tree-item]:first-child>[role=treeitem]]:pt-0',
		'[&>[data-slot=tree-item]:last-child>[role=treeitem]]:pb-0',
	],
	item: {
		base: [],
		content: itemContent,
	},
	chevron,
	/** Prefix/suffix slot wrappers flanking the label. */
	affix: 'flex flex-none items-center',
	label: 'flex-1 truncate text-left',
	group: 'overflow-hidden',
	/** Per-depth indent in rem when `indent` is enabled. Equals chevron width + row gap. */
	indentStep: {
		sm: 1.5,
		md: 1.75,
		lg: 2,
	},
	motion: collapse.fade,
} as const
