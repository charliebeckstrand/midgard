/**
 * Nav kata: object-literal surface for the `<Nav>` family.
 *
 * - `list` sets the orientation-keyed axis;
 * - `item` groups the row's parts: the `affix`-axed `base` `<li>` wrapper and
 *   inner `button`, which trade off the interaction chrome;
 * - `item` also carries the focus-projection `indicator` and the
 *   `prefix`/`suffix` slot wrappers;
 * - `bar` is the `<NavBar>` landmark frame.
 */
import { defineRecipe, type VariantProps } from '../../core/recipe'
import { hannou, kasane, narabi, omote, sen, shaku, textRamp } from '../kiso'

const { nav, cursor } = hannou
const { rounded } = kasane
const { flex } = narabi
const { border } = sen
const { bg } = omote

/**
 * Shared slot-wrapper structure for the prefix/suffix entries. Each slot is a
 * density scope one step below the item (`data-density="slot"`). A slot icon
 * or a client slot child takes that step with no projection.
 */
const affixSlot = ['relative', 'z-10', flex.row, 'shrink-0']

/**
 * Shared item structure minus the interaction surface. The padding, the gap,
 * the text, and the icon take the step of the nearest density scope. At `md`
 * the item is `p-2` with `gap-2`, `text-base`, and a `size-5` icon.
 */
const itemShell = [
	'group relative',
	flex.row,
	'w-full',
	'density-p-[1.5,2,2.5]',
	...nav.base,
	...shaku.iconSlotRamp,
	...cursor,
	'density-gap-[1.5,2,2.5]',
	textRamp,
	'text-start',
	rounded.lg,
]

/**
 * The `<li>` wrapper. Affixless it is a bare list row carrying no chrome. With
 * an affix it goes flex and takes over the interaction surface. The hover tint
 * wraps the whole row, and the inner button's keyboard focus projects onto the
 * row ring via `:has`. The affix slots therefore sit inside the tint and focus
 * ring.
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
 * surface (hover tint + inset keyboard focus). Affixed, the row owns that
 * chrome, so the button only suppresses the UA outline and flexes to fill the
 * row.
 */
const button = defineRecipe({
	base: [...itemShell, 'relative z-10'],
	affix: {
		true: ['outline-none', 'min-w-0 flex-1'],
		false: [...nav.tint, nav.focus],
	},
	defaults: { affix: false },
})

/** The {@link NavBar} landmark frame: a horizontal row of items with an optional border. */
const bar = defineRecipe({
	base: [flex.row, 'gap-4', 'overflow-x-auto', 'px-4 py-2.5', rounded.lg, 'border'],
	variant: {
		solid: [...border.defaultColor, ...bg.tint],
		outline: [...border.defaultColor],
		plain: [...border.transparent],
	},
	defaults: { variant: 'solid' },
})

export const k = {
	list: {
		base: 'flex',
		// The gap also caps the hit areas of the items (`TouchTarget`) along the
		// list, so two adjacent items split the gap and do not overlap.
		orientation: {
			vertical: ['flex-col', 'gap-0.5', '[--touch-target-gap-y:--spacing(0.5)]'],
			horizontal: ['flex-row', 'gap-1', '[--touch-target-gap-x:--spacing(1)]'],
		},
	},
	/** The `<NavBar>` landmark frame; pass `variant` (`solid` | `outline` | `plain`) for the border style. */
	bar,
	item: {
		/** The `<li>` wrapper; pass `affix` to take over the interaction chrome. */
		base,
		/** The inner button; pass `affix` to defer the chrome to the row. */
		button,
		/**
		 * Focus projection for the active indicator inside an affixed row.
		 * Browsers paint the row's own ring beneath the indicator's opaque pill.
		 * Rings and outlines render with the element's layer, under positioned
		 * descendants. The focused current row therefore re-draws the ring on the
		 * pill.
		 */
		indicator: [
			'ring-inset',
			'group-has-[[data-slot=nav-item-inner]:focus-visible]:ring-2 group-has-[[data-slot=nav-item-inner]:focus-visible]:ring-blue-600',
		],
		/**
		 * Prefix/suffix slot wrappers; sit beside the inner button inside the
		 * row chrome, above the active indicator. The margin insets the slot's
		 * outer edge by the padding of the item, so a control never sits flush
		 * against the row chrome. The slot is its own nearest scope, so its
		 * margin takes the slot step. Each list thus gives the value of an item
		 * one step above: the `xs` value is for an `sm` item.
		 */
		prefix: [...affixSlot, 'density-ms-[1.5,2,2.5,2.5,2.5]'],
		suffix: [...affixSlot, 'density-me-[1.5,2,2.5,2.5,2.5]'],
	},
} as const

/** Recipe variant props for {@link NavBar}: the `variant` style (`solid` | `outline` | `plain`). */
export type NavBarVariants = VariantProps<typeof k.bar>
