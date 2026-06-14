import { defineRecipe } from '../../core/recipe'
import { hannou, ji, kasane, narabi, shaku } from '../kiso'

const { nav, cursor } = hannou
const { size, weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { icon } = shaku

/**
 * Shared slot-wrapper structure for the prefix/suffix entries. The item chrome
 * is fixed at md, so slot icons project one step down (`icon.sm`): the static
 * `<Icon>` leaf reads no context. Client slot children read AffixContext.
 */
const affixSlot = ['relative', 'z-10', flex.row, 'shrink-0', icon.sm]

/** Shared item structure minus the interaction surface. */
const itemShell = [
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

/**
 * The `<li>` wrapper. Affixless it is a bare list row carrying no chrome; with
 * an affix it goes flex and takes over the interaction surface — the hover tint
 * wraps the whole row and the inner button's keyboard focus projects onto the
 * row ring via `:has`, so the affix slots sit inside the tint and focus ring.
 */
const base = defineRecipe({
	base: ['group relative list-none'],
	affix: {
		true: [
			'flex items-center gap-1',
			...nav.tint,
			rounded.lg,
			'ring-inset has-[[data-slot=nav-item-inner]:focus-visible]:ring-2 has-[[data-slot=nav-item-inner]:focus-visible]:ring-blue-600',
		],
		false: '',
	},
	defaults: { affix: false },
})

/**
 * The inner polymorphic button. Affixless it carries the full interaction
 * surface (hover tint + inset keyboard focus); affixed the row owns that chrome,
 * so the button only suppresses the UA outline and flexes to fill the row.
 */
const button = defineRecipe({
	base: [...itemShell, 'relative z-10'],
	affix: {
		true: ['outline-none', 'min-w-0 flex-1'],
		false: [...nav.tint, nav.focus],
	},
	defaults: { affix: false },
})

export const k = {
	list: {
		base: 'flex',
		orientation: {
			vertical: ['flex-col', 'gap-0.5'],
			horizontal: ['flex-row', 'gap-1'],
		},
	},
	navItem: {
		/** The `<li>` wrapper; pass `affix` to take over the interaction chrome. */
		base,
		/** The inner button; pass `affix` to defer the chrome to the row. */
		button,
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
		prefix: [...affixSlot, 'ml-2'],
		suffix: [...affixSlot, 'mr-2'],
	},
} as const
