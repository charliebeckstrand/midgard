import { hannou, ji, kasane, narabi } from '../kiso'

const { nav, cursor } = hannou
const { size, weight } = ji
const { rounded } = kasane
const { flex } = narabi

/** Shared slot-wrapper structure for the prefix/suffix entries. */
const affix = ['relative', 'z-10', flex.row, 'shrink-0']

/** Shared item structure minus the interaction surface. */
const itemCore = [
	'group relative',
	flex.row,
	'w-full',
	'p-2',
	...nav.base,
	...cursor,
	'gap-2',
	size.md,
	'text-left',
	weight.medium,
	rounded.lg,
]

export const k = {
	list: {
		base: 'flex',
		orientation: {
			vertical: ['flex-col', 'gap-0.5'],
			horizontal: ['flex-row', 'gap-1'],
		},
	},
	item: {
		base: [...itemCore, ...nav.tint, nav.focus],
		/** Item inside a chrome-carrying row (affixed); pairs with `row`. Only suppresses the UA outline. */
		bare: [...itemCore, 'outline-none'],
		/**
		 * Wrapper chrome for affixed items: hover tints the whole row, and the
		 * inner item's keyboard focus projects onto the row ring via `:has`.
		 * The row-focus ring wraps the affixes; each affix control keeps its
		 * own ring inside it.
		 */
		row: [
			...nav.tint,
			rounded.lg,
			'ring-inset has-[[data-slot=nav-item-inner]:focus-visible]:ring-2 has-[[data-slot=nav-item-inner]:focus-visible]:ring-blue-600',
		],
		/**
		 * Focus projection for the active indicator inside an affixed row.
		 * Browsers paint the row's own ring beneath the indicator's opaque pill
		 * (rings and outlines render with the element's layer, under positioned
		 * descendants), so the focused current row re-draws the ring on the
		 * pill.
		 */
		indicator: [
			'ring-inset',
			'group-has-[[data-slot=nav-item-inner]:focus-visible]:ring-2 group-has-[[data-slot=nav-item-inner]:focus-visible]:ring-blue-600',
		],
		/**
		 * Prefix/suffix slot wrappers; sit beside the inner button inside the
		 * row chrome, above the active indicator. The margin insets the slot's
		 * outer edge by the item's `p-2` so a control never sits flush against
		 * the row chrome.
		 */
		prefix: [...affix, 'ml-2'],
		suffix: [...affix, 'mr-2'],
	},
} as const
