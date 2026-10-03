/**
 * Tree kata: object-literal surface for the `<Tree>` treeview. The
 * `item.content` row and its `chevron` take the step of the nearest density
 * scope. The static slots cover the `base` container, `check` box, `affix`,
 * `label`, and `group`. `indent` pads each nested group, and `motion` is the collapse
 * transition. `skeleton` is the form of the `TreeSkeleton` rows.
 */
import { defineRecipe, mode } from '../../core/recipe'
import { hannou, iro, kasane, kokkaku, narabi, sen, textRamp, ugoki } from '../kiso'

const { cursor, fg } = hannou
const { text } = iro
const { rounded } = kasane
const { flex } = narabi
const { focus } = sen
const { css, collapse } = ugoki

/** The box of a row: its layout, padding, and gap. The skeleton rows take it too. */
const row = [flex.row, 'w-full', 'py-1 px-2', 'gap-2']

const itemContent = defineRecipe(
	{
		base: [
			...row,
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

/**
 * The check box of a checkable row. It is a picture of the state, not a
 * control: the treeitem carries `aria-checked` and takes the keys. It has the
 * size, the corners, and the zinc fill of the Checkbox box. The row hover
 * darkens its border, as a label hover does on a Checkbox.
 */
const check = [
	'flex-none',
	flex.inline,
	'items-center justify-center',
	kokkaku.checkbox.box,
	'density-rounded-[0.75,1,1.25]',
	...mode(
		['bg-white', 'border border-zinc-950/50', 'group-hover/tree-item:border-zinc-950/70'],
		['dark:bg-white/5', 'dark:border-white/35', 'dark:group-hover/tree-item:border-white/50'],
	),
	'data-[checked]:bg-zinc-600 data-[checked]:border-zinc-700/90',
	'dark:data-[checked]:bg-zinc-600 dark:data-[checked]:border-zinc-700/90',
	'data-[checked]:group-hover/tree-item:opacity-90',
]

/** The mark in the check box. It takes the step of the nearest density scope. */
const checkMark = ['stroke-white', 'density-size-[3,3.5,4]']

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
	check,
	checkMark,
	/** Prefix/suffix slot wrappers flanking the label. The slots hold no control. */
	affix: 'flex flex-none items-center',
	label: 'flex-1 truncate text-start',
	group: 'overflow-hidden',
	/**
	 * The start padding of a nested group when `indent` is enabled. It equals
	 * the chevron width plus the row gap, so each depth adds one step of it.
	 */
	indent: 'density-ps-[6,7,8]',
	motion: collapse.fade,
	skeleton: { ...kokkaku.tree, row },
} as const
