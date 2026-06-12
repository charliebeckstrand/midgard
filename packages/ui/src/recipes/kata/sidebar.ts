import { defineRecipe, type VariantProps } from '../../core/recipe'
import { hannou, ji, kasane, narabi, sen, shaku } from '../kiso'

const { nav, cursor } = hannou
const { size } = ji
const { gap, padding, radius } = kasane
const { flex } = narabi
const { divider } = sen
const { icon } = shaku

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
	base: [...nav.base, ...cursor, 'group relative', flex.row, 'w-full', 'text-left', mini.square],
	size: {
		sm: [size.sm, gap.g('1.5'), padding.p('1.5'), radius.r('1.5'), icon.sm],
		md: [size.md, gap.g('2'), padding.p('2'), radius.r('2'), icon.md],
		lg: [size.lg, gap.g('2.5'), padding.p('2.5'), radius.r('2.5'), icon.lg],
	},
	// Where the interaction surface lives. `item`: on the element itself, the
	// affixless default. `row`: re-seated on the wrapper (`k.item.row`) so affix
	// slots render inside the hover tint and focus ring; the item then only
	// suppresses the UA outline.
	chrome: {
		item: [nav.tint, nav.focus],
		row: 'outline-none',
	},
	defaults: { size: 'md', chrome: 'item' },
})

/**
 * Wrapper chrome for affixed items (`chrome: 'row'`): hover tints the whole
 * row, and the inner item's keyboard focus projects onto the row ring via
 * `:has`. The row-focus ring wraps the affixes; each affix control keeps its
 * own ring inside it.
 */
const itemRow = defineRecipe({
	base: [
		...nav.tint,
		'ring-inset has-[[data-slot=sidebar-item-inner]:focus-visible]:ring-2 has-[[data-slot=sidebar-item-inner]:focus-visible]:ring-blue-600',
	],
	size: {
		sm: radius.r('1.5'),
		md: radius.r('2'),
		lg: radius.r('2.5'),
	},
	defaults: { size: 'md' },
})

/**
 * Prefix/suffix slot wrappers; sit beside the inner button inside the row
 * chrome, above the active indicator. The margin insets the slot's outer edge
 * by the inner item's padding step so a control never sits flush against the
 * chrome; it lives on the slot, not the row, so the mini rail (which hides
 * the slot) keeps its square geometry.
 */
const affix = ['relative', 'z-10', flex.row, 'shrink-0', mini.hidden]

// Slot icons project one step below the item (`affixStepDown`): the static
// `<Icon>` leaf reads no context. Client slot children (a small `<Button>`
// action) read the stepped-down AffixContext.
const itemPrefix = defineRecipe({
	base: affix,
	size: { sm: ['ml-1.5', icon.xs], md: ['ml-2', icon.sm], lg: ['ml-2.5', icon.md] },
	defaults: { size: 'md' },
})

const itemSuffix = defineRecipe({
	base: affix,
	size: { sm: ['mr-1.5', icon.xs], md: ['mr-2', icon.sm], lg: ['mr-2.5', icon.md] },
	defaults: { size: 'md' },
})

export const k = {
	base: ['group/sidebar', mini.rail, 'overflow-y-auto', flex.col, 'gap-y-4', 'h-full', 'p-6'],
	mini,
	item: {
		base: itemBase,
		/** Wrapper-row surface for affixed items; pairs with `base({ chrome: 'row' })`. */
		row: itemRow,
		/**
		 * Focus projection for the active indicator inside an affixed row.
		 * Browsers paint the row's own ring beneath the indicator's opaque pill
		 * (rings and outlines render with the element's layer, under positioned
		 * descendants), so the focused current row re-draws the ring on the
		 * pill: the topmost full-row surface.
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

export type SidebarItemVariants = VariantProps<typeof itemBase>
