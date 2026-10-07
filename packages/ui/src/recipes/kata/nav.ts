/**
 * Nav kata: object-literal surface for the `<Nav>` family.
 *
 * - `list` sets the orientation-keyed axis;
 * - `item` groups the row's parts: the `affix`-axed `base` `<li>` wrapper and
 *   inner `button`, which trade off the interaction chrome;
 * - `item` also carries the focus-projection `indicator` and the
 *   `prefix`/`suffix` slot wrappers;
 * - `bar.base` is the `<NavBar>` landmark frame, and `bar.rail` is the row of
 *   items inside it;
 * - `skeleton` is the form of the `<NavSkeleton>` rows.
 */
import { defineRecipe, type VariantProps } from '../../core/recipe'
import { hannou, ji, kasane, kokkaku, narabi, omote, sen, shaku } from '../kiso'
import { dan } from '../kiso/dan'

const { nav, cursor } = hannou
const { rounded } = kasane
const { flex, inset } = narabi
const { border } = sen
const { bg, rail } = omote

/**
 * Shared slot-wrapper structure for the prefix/suffix entries. Each slot is a
 * density scope one step below the item (`data-density="slot"`). A slot icon
 * or a client slot child takes that step with no projection.
 */
const affixSlot = ['relative', 'z-10', flex.row, 'shrink-0']

/**
 * The box of an item: the axis, the padding, the gap, the text, and the
 * radius. These take the step of the nearest density scope. At `md` the item
 * is `p-2` with `gap-2` and `text-base`. The skeleton row takes the same box,
 * so the two boxes match.
 */
const itemBox = [flex.row, 'w-full', dan.space.nav.item, dan.gap.item, ji.ramp, rounded.lg]

/**
 * Shared item structure minus the interaction surface. The icon takes the
 * step of the nearest density scope. At `md` it is `size-5`.
 */
const itemShell = [
	'group',
	...itemBox,
	...nav.base,
	...shaku.icon.slot.base,
	...cursor,
	'text-start',
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
			`flex items-center ${dan.gap.scale.xs}`,
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

/**
 * The {@link NavBar} landmark frame, with an optional border. The row of items
 * scrolls in the `bar.rail` inside it. The edge fade of the rail masks the
 * whole box, so the frame keeps its border and fill.
 */
const bar = defineRecipe({
	base: ['px-4 py-2.5', rounded.lg, 'border'],
	variant: {
		solid: [...border.color.default, ...bg.tint],
		outline: [...border.color.default],
		plain: [...border.color.transparent],
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
			horizontal: ['flex-row', dan.gap.scale.xs, ...dan.gap.touch.x.xs],
		},
	},
	bar: {
		/** The `<NavBar>` landmark frame; pass `variant` (`solid` | `outline` | `plain`) for the border style. */
		base: bar,
		/** The row of items in a `<NavBar>`. While it overflows, the edge with more items behind it fades. */
		rail: [flex.row, dan.gap.scale.lg, ...rail],
	},
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
		 * row chrome, above the active indicator. `narabi.inset` moves the outer
		 * edge of the slot in by the padding of the item.
		 */
		prefix: [...affixSlot, inset.prefix],
		suffix: [...affixSlot, inset.suffix],
		/** The box of the inner button, with no interaction surface, for the skeleton row. */
		box: itemBox,
	},
	skeleton: kokkaku.nav,
} as const

/** Recipe variant props for {@link NavBar}: the `variant` style (`solid` | `outline` | `plain`). */
export type NavBarVariants = Omit<VariantProps<typeof k.bar.base>, 'variant'> & {
	/** The frame of the bar: a border and a tinted fill, a border alone, or neither. @defaultValue 'solid' */
	variant?: VariantProps<typeof k.bar.base>['variant']
}
