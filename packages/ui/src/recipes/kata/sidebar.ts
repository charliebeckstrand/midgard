/**
 * Sidebar kata: the unit of `<Sidebar>`. The root slot `base` is the nav, and
 * the child slots are its parts: `section`, `list`, `label`, `header`, `body`,
 * `divider`, and `footer`. `item` is the unit of a row, which extends the nav
 * group, and `skeleton` is the form of a skeleton row.
 */
import { defineScale } from '../../core/density'
import { defineKata } from '../../core/recipe'
import { dan, ji, kokkaku, narabi, sen } from '../kiso'
import { box, nav } from '../kumi/nav'

const { flex } = narabi
const { divider } = sen

/**
 * Mini (icon-rail) rules, active when the nav carries `data-mini`. The nav
 * leaves the attribute off in the drawer of a layout, so the drawer keeps the
 * full layout.
 */
const mini = {
	/** Collapses the nav to its intrinsic icon-rail width. */
	rail: 'data-mini:w-fit',
	/** Removes a slot from the rail entirely (affixes, item actions, header content). */
	hidden: 'group-data-mini/sidebar:hidden',
	/** Visually removes the label from the rail but keeps it in the accessible name. */
	srOnly: 'group-data-mini/sidebar:sr-only',
	/**
	 * Squares the item to the rail width with the icon centered. The width of
	 * the widest icon sets the rail, so height-from-width keeps every item the
	 * same square even when glyph aspect ratios differ (FontAwesome).
	 */
	square: 'group-data-mini/sidebar:aspect-square group-data-mini/sidebar:justify-center',
} as const

/**
 * The padding of the inner button and the mini-rail square. Each step is in a
 * stepped `density-*` class: the item takes the step of its nearest density
 * scope, and an explicit `size` makes the row its own scope.
 */
const padding = [mini.square, dan.space.sidebar.item.base]

/**
 * The affix slots of a row. The slot touches the link of the item, so a control
 * in it keeps its hit area to its own width (`TouchTarget`), and the hit area
 * does not reach over the link. The margin of the slot, not the row, insets
 * the control, so the mini rail (which hides the slot) keeps its square
 * geometry.
 */
const affix = ['[--touch-target-gap-x:0px]', mini.hidden]

/**
 * A row of the sidebar: the `<li>` or `<div>` wrapper and the inner button. The
 * row-focus ring of an affixed row wraps the affixes, and each affix control
 * keeps its own ring inside it.
 */
const item = defineKata(
	{
		extends: nav,
		slots: {
			button: [
				...padding,
				// The inner Button has a text label, so its `data-has-label` padding
				// repeats the row padding. Thus the Button class merges away.
				dan.space.sidebar.item.label,
				// The item wraps its `icon` in Icon. The row sizes the icon and a
				// LoadingSpinner child at the glyph size of its step. An Avatar child sizes itself in a row: its own
				// recipe selects the inner button of the row. See `kata/avatar.ts`.
				dan.size.icon.spinner,
				// The current row is the initial scroll target of the sidebar: the first
				// layout puts it at the top of the view, so the server markup paints with
				// the row in view, and no script scrolls. The section is the target in
				// place of its first row (`section`). `CurrentScrollScript` does the same
				// in a browser without `scroll-initial-target`.
				'data-current:[scroll-initial-target:nearest]',
			],
			prefix: affix,
			suffix: affix,
		},
	},
	{
		/** The box of the inner button, with no interaction surface, for the skeleton row. */
		box: [...box, ...padding],
	},
)

/**
 * A stack of items. Its gap also caps the hit areas of the items (`TouchTarget`),
 * so two adjacent items split the gap and do not overlap.
 */
const stack = [flex.col, 'gap-0.5', '[--touch-target-gap-y:--spacing(0.5)]']

/**
 * The scroll of the nav and of its body: on the vertical axis only. A sidebar
 * never scrolls on the horizontal axis. A vertical scroller also scrolls its
 * horizontal overflow, and on a coarse pointer the hit area of a small control
 * at the edge (`TouchTarget`) goes past the edge. The horizontal axis thus
 * clips, and a label that is too long truncates (`label`).
 */
const scroll = 'overflow-x-hidden overflow-y-auto overscroll-contain'

export const k = defineKata(
	{
		base: ['group/sidebar', mini.rail, scroll, flex.col, dan.gap.y.lg, 'h-full', 'p-6'],
		slots: {
			// When the current row is the first of the section, the section is the
			// initial scroll target, so the label of the section shows above the row.
			// A target earlier in the tree wins, so the row is not the target.
			section: [
				...stack,
				'has-[>[data-slot=sidebar-list]>li:first-child_[data-current]]:[scroll-initial-target:nearest]',
			],
			list: stack,
			label: ['truncate', mini.srOnly],
			header: [flex.row, dan.gap.scale.md],
			body: [scroll, flex.col, flex.fill, dan.gap.scale.lg],
			divider: divider.top,
			footer: ['sticky bottom-0', ...stack, 'mt-auto'],
		},
	},
	{
		item,
		// A sidebar item has the form of a nav item. The mini rail removes the label
		// line, as it hides the label of a real item.
		skeleton: {
			icon: kokkaku.nav.icon,
			label: [kokkaku.nav.label, mini.hidden],
		},
	},
)

/** The size scale of {@link SidebarItem}: the steps of its text, gap, padding, and radius. */
export const scale = defineScale(
	ji.ramp,
	dan.gap.item,
	dan.space.sidebar.item.base,
	dan.radius.control,
)
