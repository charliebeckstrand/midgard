/**
 * Tree kata: object-literal surface for the `<Tree>` treeview. The
 * `item.content` row and its `chevron` take the step of the nearest density
 * scope. The static slots cover the `base` container, `affix`, `label`, and
 * `group`. `indent` pads each nested group, and `motion` is the collapse
 * transition.
 */
import { defineRecipe, mode } from '../../core/recipe'
import { hannou, iro, kasane, narabi, type Step, sen, textRamp, ugoki } from '../kiso'

const { cursor, fg } = hannou
const { text } = iro
const { rounded } = kasane
const { flex } = narabi
const { focus } = sen
const { css, collapse } = ugoki

export type TreeSize = Step

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
			textRamp,
		],
	},
	{ current: text.default },
)

/** The chevron column. Its width is the icon size of the step. */
const chevron = [
	'flex-none',
	flex.row,
	'justify-center',
	'density-w-[4,5,6]',
	css.transform,
	css.duration,
]

export const k = {
	base: [
		flex.col,
		// Trims outer vertical padding on edge rows, flushing the tree with its container.
		'[&>[data-slot=tree-item]:first-child>[role=treeitem]]:pt-0',
		'[&>[data-slot=tree-item]:last-child>[role=treeitem]]:pb-0',
	],
	item: {
		content: itemContent,
	},
	chevron,
	/** Prefix/suffix slot wrappers flanking the label. */
	affix: 'flex flex-none items-center',
	label: 'flex-1 truncate text-start',
	group: 'overflow-hidden',
	/**
	 * The start padding of a nested group when `indent` is enabled. It equals
	 * the chevron width plus the row gap, so each depth adds one step of it.
	 */
	indent: 'density-ps-[6,7,8]',
	motion: collapse.fade,
} as const
