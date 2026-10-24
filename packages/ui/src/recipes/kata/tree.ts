/**
 * Tree kata: the unit of the `<Tree>` treeview. The `content` row, its
 * `chevron`, and the check `mark` take the step of the nearest density scope.
 * The other slots are the `base` container, the `check` box, `affix`, `label`,
 * and `group`. The `indent` axis of `group` pads each nested group, and
 * `motion` is the collapse transition. `skeleton` is the form of the
 * `TreeSkeleton` rows.
 */
import { defineScale } from '../../core/density'
import { defineKata, mode } from '../../core/recipe'
import { dan, hannou, iro, ji, kasane, kokkaku, narabi, sen, ugoki } from '../kiso'
import { rest } from '../kumi/check'

const { cursor, fg } = hannou
const { text } = iro
const { rounded } = kasane
const { flex } = narabi
const { focus } = sen
const { css, collapse } = ugoki

/** The box of a row: its layout, padding, and gap. The skeleton rows take it too. */
const row = [flex.row, 'w-full', dan.space.tree.y, dan.space.tree.x, dan.gap.scale.sm]

/**
 * The check box of a checkable row. It is a picture of the state, not a
 * control: the treeitem carries `aria-checked` and takes the keys. It has the
 * size, the corners, and the zinc fill of the Checkbox box. The row hover
 * darkens its border, as a label hover does on a Checkbox.
 */
const check = [
	'flex-none',
	flex.inline,
	'justify-center',
	kokkaku.checkbox.box,
	dan.radius.check,
	...rest,
	...mode('group-hover/tree-item:border-zinc-950/70', 'dark:group-hover/tree-item:border-white/50'),
	'data-checked:bg-zinc-600 data-checked:border-zinc-700/90',
	'dark:data-checked:bg-zinc-600 dark:data-checked:border-zinc-700/90',
	'data-checked:group-hover/tree-item:opacity-90',
	// Forced colors remove the fill, so a checked or mixed box paints in
	// `Highlight`, as a `sen.forced.mark` does.
	'forced-colors:data-checked:bg-[Highlight]',
]

/**
 * The mark in the check box. It takes the step of the nearest density scope.
 * Under forced colors, it paints in `HighlightText` on the `Highlight` box.
 */
const mark = ['stroke-white', 'forced-colors:stroke-[HighlightText]', dan.size.check.mark]

/** The chevron column. Its width is the icon size of the step. */
const chevron = [
	'flex-none',
	flex.row,
	'justify-center',
	dan.size.tree.indent,
	css.transform,
	css.duration,
]

export const k = defineKata(
	{
		base: [
			flex.col,
			// Trims the outer block padding of the first and last visible rows, so the
			// tree is flush with its container. The last visible row is a row of a
			// last item, in a chain of last items. Thus each row of that chain has no
			// bottom padding, and the group of each item in the chain has that space
			// at its top (`group`). The space then opens and closes with the height
			// of the group, and no row moves while the group moves.
			'[&>[data-slot=tree-item]:first-child>[role=treeitem]]:pt-0',
			'[&_[data-slot=tree-item]:last-child:not([data-slot=tree-item]:not(:last-child)_*)>[role=treeitem]]:pb-0',
		],
		slots: {
			item: {
				slots: {
					/** The row of an item: the treeitem. */
					content: {
						base: [
							...row,
							text.muted,
							fg.hover,
							rounded.lg,
							focus.inset,
							...cursor,
							'select-none',
							...fg.open,
							ji.ramp,
						],
						// Forced colors map the text of each row to `CanvasText`, so the current
						// row also takes an underline there.
						current: {
							true: [text.default, 'forced-colors:underline forced-colors:decoration-2'],
							false: '',
						},
					},
				},
			},
			chevron,
			check: {
				base: check,
				slots: {
					mark,
				},
			},
			/** Prefix/suffix slot wrappers flanking the label. The slots hold no control. */
			affix: 'flex flex-none items-center',
			label: 'flex-1 truncate text-start',
			// A group has no clip of its own: its motion clips it only while its height
			// moves.
			group: {
				/** The group of an item in the chain of last items has the bottom padding of its row at its top. */
				base: [
					'[[data-slot=tree-item]:last-child:not([data-slot=tree-item]:not(:last-child)_*)>&]:before:block',
					dan.space.tree.lead,
				],
				/**
				 * The start padding of a nested group when `indent` is enabled. It equals
				 * the chevron width plus the row gap, so each depth adds one step of it.
				 */
				indent: {
					true: dan.space.tree.indent,
					false: '',
				},
			},
		},
		defaults: { current: false, indent: false },
	},
	{ motion: collapse.fade, skeleton: { ...kokkaku.tree, row } },
)

/** The size scale of {@link Tree}: the steps of its icon, row, and indent. */
export const scale = defineScale(
	dan.size.icon.base,
	dan.size.row,
	dan.space.tree.indent,
	dan.size.tree.indent,
)
