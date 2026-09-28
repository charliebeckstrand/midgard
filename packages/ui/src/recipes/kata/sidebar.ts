import type { DensityStep } from '../../core/density'
import { defineRecipe, type VariantProps } from '../../core/recipe'
import { hannou, narabi, sen, shaku, textRamp } from '../kiso'

const { nav, cursor } = hannou
const { flex } = narabi
const { divider } = sen
const { iconSlotRamp } = shaku

/**
 * Mini (icon-rail) rules, active when the nav carries `data-mini`. Every rule
 * is `lg:`-scoped: below the desktop breakpoint the same markup keeps its full
 * layout, so the mobile drawer renders naturally.
 */
const mini = {
	/** Collapses the nav to its intrinsic icon-rail width. */
	rail: 'lg:data-[mini]:w-fit',
	/** Removes a slot from the rail entirely (affixes, item actions, header content). */
	hidden: 'lg:group-data-[mini]/sidebar:hidden',
	/** Visually removes the label from the rail but keeps it in the accessible name. */
	srOnly: 'lg:group-data-[mini]/sidebar:sr-only',
	/**
	 * Squares the item to the rail width with the icon centered. The width of
	 * the widest icon sets the rail, so height-from-width keeps every item the
	 * same square even when glyph aspect ratios differ (FontAwesome).
	 */
	square: 'lg:group-data-[mini]/sidebar:aspect-square lg:group-data-[mini]/sidebar:justify-center',
} as const

const itemBase = defineRecipe({
	base: [
		...nav.base,
		...cursor,
		'group relative z-10',
		flex.row,
		'w-full',
		'text-start',
		mini.square,
		// Each step is in a stepped `density-*` class: the item takes the step of
		// its nearest density scope, and an explicit `size` makes the row its own
		// scope. The inner Button has a text label, so its `data-has-label`
		// padding repeats the row padding. Thus the Button class merges away.
		textRamp,
		'density-gap-[1.5,2,2.5]',
		'density-p-ring-[1.5,2,2.5]',
		'data-[has-label]:density-py-ring-[1.5,2,2.5]',
		'density-rounded-[1.5,2,2.5]',
		...iconSlotRamp,
		// An Avatar is static and keeps its own md box, so each row projects a size
		// onto it: one step above the icon, with a negative margin, so that the row
		// keeps the height of a row with an icon. A LoadingSpinner takes the size of
		// the icon row.
		'*:data-[slot=avatar]:density-size-[5,6,7] *:data-[slot=avatar]:-m-0.5',
		'*:data-[slot=loading-spinner]:density-size-[4,5,6]',
	],
	// Where the interaction surface lives. `item`: on the element itself, the
	// affixless default. `row`: re-seated on the wrapper (`k.item.row`) so affix
	// slots render inside the hover tint and focus ring; the item then only
	// suppresses the UA outline and flexes to fill the row.
	chrome: {
		item: [nav.tint, nav.focus],
		row: ['outline-none', 'min-w-0 flex-1'],
	},
	defaults: { chrome: 'item' },
})

/**
 * The `<li>`/`<span>` wrapper. Affixless it is a bare row carrying no chrome.
 * With an affix (`affix: true`) it goes flex and takes over the interaction
 * surface. The hover tint wraps the whole row, and the inner item's keyboard
 * focus projects onto the row ring via `:has`. The row-focus ring wraps the
 * affixes; each affix control keeps its own ring inside it.
 */
const itemRow = defineRecipe({
	base: ['group relative list-none'],
	affix: {
		true: [
			'flex items-center',
			// The wrapper only needs a radius when it carries the affixed row chrome.
			'density-rounded-[1.5,2,2.5]',
			...nav.tint,
			'ring-inset has-[[data-slot=sidebar-item-inner]:focus-visible]:ring-2 has-[[data-slot=sidebar-item-inner]:focus-visible]:ring-blue-600',
		],
		false: '',
	},
	defaults: { affix: false },
})

/**
 * Prefix/suffix slot wrappers; sit beside the inner button inside the row
 * chrome, above the active indicator. The margin insets the slot's outer edge
 * by the inner item's padding step, so a control never sits flush against the
 * chrome. It lives on the slot, not the row, so the mini rail (which hides
 * the slot) keeps its square geometry.
 */
const affix = ['relative', 'z-10', flex.row, 'shrink-0', mini.hidden]

// Each slot is a density scope one step below the item (`data-density="slot"`),
// so a slot icon or a small `<Button>` action takes that step with no
// projection. The slot is its own nearest scope, so its margin takes the slot
// step. Each list thus gives the value of an item one step above: the `xs`
// value is for an `sm` item, and the `md` value is for an `lg` item.
const itemPrefix = [...affix, 'density-ms-[1.5,2,2.5,2.5,2.5]']

const itemSuffix = [...affix, 'density-me-[1.5,2,2.5,2.5,2.5]']

export const k = {
	base: ['group/sidebar', mini.rail, 'overflow-y-auto', flex.col, 'gap-y-4', 'h-full', 'p-6'],
	item: {
		base: itemBase,
		/** Wrapper-row surface for affixed items; pairs with `base({ chrome: 'row' })`. */
		row: itemRow,
		/**
		 * Focus projection for the active indicator inside an affixed row.
		 * Browsers paint the row's own ring beneath the indicator's opaque pill,
		 * because rings and outlines render with the element's layer, under
		 * positioned descendants. The focused current row therefore re-draws the ring
		 * on the pill, the topmost full-row surface.
		 */
		indicator: [
			'ring-inset',
			'group-has-[[data-slot=sidebar-item-inner]:focus-visible]:ring-2 group-has-[[data-slot=sidebar-item-inner]:focus-visible]:ring-blue-600',
		],
		prefix: itemPrefix,
		suffix: itemSuffix,
	},
	section: [flex.col, 'gap-0.5'],
	list: [flex.col, 'gap-0.5'],
	label: ['truncate', mini.srOnly],
	header: [flex.row, 'gap-3'],
	body: ['overflow-y-auto', flex.col, flex.fill, 'gap-4'],
	divider: divider.top,
	footer: ['sticky bottom-0', flex.col, 'gap-0.5', 'mt-auto'],
} as const

/** Recipe variant props for {@link SidebarItem}: the `size` step and `chrome` surface (`item` | `row`). */
export type SidebarItemVariants = VariantProps<typeof itemBase> & { size?: DensityStep }
