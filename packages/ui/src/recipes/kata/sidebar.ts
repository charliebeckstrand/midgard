import { defineScale } from '../../core/density'
import { defineRecipe } from '../../core/recipe'
import { hannou, ji, kokkaku, narabi, sen, shaku } from '../kiso'
import { dan } from '../kiso/dan'

const { nav, cursor } = hannou
const { flex, inset } = narabi
const { divider } = sen

/**
 * Mini (icon-rail) rules, active when the nav carries `data-mini`. Every rule
 * is `lg:`-scoped: below the desktop breakpoint the same markup keeps its full
 * layout, so the mobile drawer renders naturally.
 */
const mini = {
	/** Collapses the nav to its intrinsic icon-rail width. */
	rail: 'lg:data-mini:w-fit',
	/** Removes a slot from the rail entirely (affixes, item actions, header content). */
	hidden: 'lg:group-data-mini/sidebar:hidden',
	/** Visually removes the label from the rail but keeps it in the accessible name. */
	srOnly: 'lg:group-data-mini/sidebar:sr-only',
	/**
	 * Squares the item to the rail width with the icon centered. The width of
	 * the widest icon sets the rail, so height-from-width keeps every item the
	 * same square even when glyph aspect ratios differ (FontAwesome).
	 */
	square: 'lg:group-data-mini/sidebar:aspect-square lg:group-data-mini/sidebar:justify-center',
} as const

/**
 * The box of an item: the axis, the text, the gap, the padding, the radius,
 * and the mini-rail square. The skeleton row takes the same box, so the two
 * boxes match.
 *
 * Each step is in a stepped `density-*` class: the item takes the step of its
 * nearest density scope, and an explicit `size` makes the row its own scope.
 */
const itemBox = [
	flex.row,
	'w-full',
	mini.square,
	ji.ramp,
	dan.gap.item,
	dan.space.sidebar.item.base,
	dan.radius.control,
]

const itemBase = defineRecipe({
	base: [
		...nav.base,
		...cursor,
		'group relative z-10',
		...itemBox,
		'text-start',
		// The inner Button has a text label, so its `data-has-label` padding
		// repeats the row padding. Thus the Button class merges away.
		dan.space.sidebar.item.label,
		// The item wraps its `icon` in Icon. The row sizes the icon and a
		// LoadingSpinner child at the glyph size of its step. An Avatar child sizes itself in a row: its own
		// recipe selects the inner button of the row. See `kata/avatar.ts`.
		...shaku.icon.slot.base,
		dan.size.icon.spinner,
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
 * The `<li>`/`<div>` wrapper. Affixless it is a bare row carrying no chrome.
 * With an affix (`affix: true`) it goes flex and takes over the interaction
 * surface. The hover tint wraps the whole row, and the inner item's keyboard
 * focus projects onto the row ring via `:has`. The row-focus ring wraps the
 * affixes; each affix control keeps its own ring inside it.
 */
const itemRow = defineRecipe({
	base: ['group relative list-none'],
	affix: {
		true: [
			flex.row,
			// The wrapper only needs a radius when it carries the affixed row chrome.
			dan.radius.control,
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
 *
 * The slot touches the link of the item, so a control in it keeps its hit area
 * to its own width (`TouchTarget`), and the hit area does not reach over the link.
 */
const affix = ['relative', 'z-10', flex.row, 'shrink-0', '[--touch-target-gap-x:0px]', mini.hidden]

// Each slot is a density scope one step below the item (`data-density="slot"`),
// so a slot icon or a small `<Button>` action takes that step with no
// projection. `narabi.inset` gives the margin at that step.
const itemPrefix = [...affix, inset.prefix]

const itemSuffix = [...affix, inset.suffix]

/** The cap on the hit areas of a stack of items: the `gap-0.5` of the stack (`TouchTarget`). */
const stackTargets = '[--touch-target-gap-y:--spacing(0.5)]'

export const k = {
	base: [
		'group/sidebar',
		mini.rail,
		'overflow-y-auto overscroll-contain',
		flex.col,
		dan.gap.y.lg,
		'h-full',
		'p-6',
	],
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
		/** The box of the inner button, with no interaction surface, for the skeleton row. */
		box: itemBox,
	},
	// `stackTargets` caps the hit areas, so two adjacent items do not overlap.
	section: [flex.col, 'gap-0.5', stackTargets],
	list: [flex.col, 'gap-0.5', stackTargets],
	label: ['truncate', mini.srOnly],
	header: [flex.row, dan.gap.scale.md],
	body: ['overflow-y-auto overscroll-contain', flex.col, flex.fill, dan.gap.scale.lg],
	divider: divider.top,
	footer: ['sticky bottom-0', flex.col, 'gap-0.5', stackTargets, 'mt-auto'],
	// A sidebar item has the form of a nav item. The mini rail removes the label
	// line, as it hides the label of a real item.
	skeleton: {
		icon: kokkaku.nav.icon,
		label: [kokkaku.nav.label, mini.hidden],
	},
} as const

/** The size scale of {@link SidebarItem}: the steps of its text, gap, padding, and radius. */
export const scale = defineScale(
	ji.ramp,
	dan.gap.item,
	dan.space.sidebar.item.base,
	dan.radius.control,
)
