import { defineRecipe, type VariantProps } from '../../core/recipe'
import { hannou, ji, kasane, narabi, sen, shaku } from '../kiso'

const { nav, navInner, cursor } = hannou
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
	/** Centers the content strip's icon on the rail, where the label is sr-only. */
	center: 'lg:group-data-[mini]/sidebar:justify-center',
} as const

/**
 * The row (`<li>`/`<span>`) owns the painted chrome — hover wash, padding,
 * radius, focus ring via `:has()` — so siblings (actions, affixes) sit inside
 * the wash while staying outside the inner button.
 */
const itemBase = defineRecipe({
	base: [...nav, ...cursor, 'group relative', flex.row, 'w-full', mini.square],
	size: {
		sm: [size.sm, gap.g('1.5'), padding.p('1.5'), radius.r('1.5')],
		md: [size.md, gap.g('2'), padding.p('2'), radius.r('2')],
		lg: [size.lg, gap.g('2.5'), padding.p('2.5'), radius.r('2.5')],
	},
	defaults: { size: 'md' },
})

/**
 * The inner button/link: a transparent content strip that grows to fill the
 * row, so the hit area covers everything except action/affix islands. Icon
 * sizing lives here because the slot form targets direct children.
 */
const itemInner = defineRecipe({
	base: [...navInner, mini.center],
	size: {
		sm: [gap.g('1.5'), icon.sm],
		md: [gap.g('2'), icon.md],
		lg: [gap.g('2.5'), icon.lg],
	},
	defaults: { size: 'md' },
})

export const k = {
	base: ['group/sidebar', mini.rail, 'overflow-y-auto', flex.col, 'gap-y-4', 'h-full', 'p-6'],
	mini,
	item: {
		base: itemBase,
		inner: itemInner,
		/** Wrapper for a prefix/suffix slot; sits outside the inner button, above the active indicator. */
		affix: ['relative', 'z-10', flex.row, 'shrink-0', mini.hidden],
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
