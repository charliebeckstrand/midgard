/**
 * Tabs kata: serves both the underline `<Tabs>` list and the `<Segment>` box,
 * two units through one surface. The slots of the underline tabs share the
 * `orientation` and `stretch` props, and each slot declares the axes that
 * change it. The root slot `base` is the tab group. `segment` holds the parts
 * of the segment box, which Segment and Tabs share through this kata, and
 * `skeleton` carries a loading placeholder for each unit.
 */
import { defineScale } from '../../core/density'
import { defineKata, mode } from '../../core/recipe'
import { hannou, iro, ji, kasane, kokkaku, narabi, omote, sen } from '../kiso'
import { dan } from '../kiso/dan'

const { cursor, disabled, fg } = hannou
const { on, text } = iro
const { weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { bg, rail } = omote
const { border, focus, forced } = sen

/**
 * The segment box: the rounded box with a sliding indicator, behind `<Segment>`
 * and `<Tabs variant="segment">`. The gap, the padding, and the text take the
 * step of the nearest density scope.
 */
const segment = {
	/**
	 * The box that holds the items and the indicator. `self-start` keeps the box
	 * at the width of its content inside the `flex flex-col` tab group, over the
	 * `align-items: stretch` of the cross axis. `max-w-full` holds it inside its
	 * container: where the labels do not fit on one line, the items shrink and
	 * wrap their labels, and the page does not widen.
	 */
	control: [
		flex.inline,
		'self-start max-w-full',
		...bg.tint,
		rounded.lg,
		`p-1 ${dan.gap.default}`,
		ji.ramp,
	],
	/** One item of the box: the layout, the focus ring, and the disabled and cursor states. */
	item: [
		flex.row,
		'justify-center',
		// A label stays on one line while the control fits its container. Where it
		// does not, the item shrinks to its longest word and the label wraps.
		'text-center text-balance',
		rounded.lg,
		weight.medium,
		// iOS Safari can select the text in a child of a `select-none` item on a long
		// press, so the children also set it.
		'select-none *:select-none',
		// The selected item steps to full-strength ink and the rest stay muted, as
		// the underline tab does. The indicator is then not the only mark of the
		// selected item, and the distinction does not rest on a fill alone (WCAG
		// 1.4.1).
		//
		// `on.wash.muted`, not `muted`: an item sits on the wash track of the box,
		// which `muted` is not legal over. See `iro/ramp.ts`.
		...on.wash.muted,
		...fg.current,
		// The ring alone marks focus. The `::after` marker of a tab has no position
		// here, so it becomes a flex item, and the gap widens the focused item.
		focus.ring,
		...disabled,
		...cursor,
		`${dan.text.small} ${dan.space.segment.item.x} ${dan.space.row.y}`,
		// An icon is the small text size plus 4 px, as an icon beside body text is.
		dan.size.icon.small,
		'*:data-[slot=icon]:shrink-0',
		dan.gap.item,
	],
	/** The sliding fill that marks the active item and moves between the items. */
	indicator: mode('bg-white', 'dark:bg-zinc-600'),
} as const

export const k = defineKata(
	{
		slots: {
			/** The tab group: it stacks the list and the panels, and the orientation sets its axis. */
			base: {
				base: ['flex', dan.gap.scale.lg],
				orientation: { horizontal: 'flex-col', vertical: 'flex-row' },
			},
			/**
			 * The underline list, which draws the baseline rail (`border-b` /
			 * `border-s`) that the tabs sit on. A horizontal list sizes to
			 * `max-content` (never below `100%`), so the rail spans the full scroll
			 * width. A block-level flex box otherwise fills only the viewport, which
			 * clips the rail there and strands overflowed tabs above bare space. A
			 * vertical list needs no counterpart: an auto-height column already grows to
			 * its content, so `border-s` runs the full length of every stacked tab.
			 */
			list: {
				base: ['flex', ...border.color.subtle],
				orientation: {
					horizontal: ['border-b', 'w-max', 'min-w-full'],
					vertical: ['flex-col', 'border-s'],
				},
			},
			/**
			 * The overflow viewport around the underline list: an over-long tab row
			 * scrolls within it instead of widening the page. The cross axis stays
			 * clipped: the active-indicator/focus rail sits flush with the content edge,
			 * so nothing is lost. The native scrollbar is hidden, so it never crosses the
			 * rail. The active tab scrolls into view, and roving keeps every tab
			 * reachable. While a horizontal row overflows, the edge with more tabs
			 * behind it fades.
			 *
			 * A vertical list sits beside the panel in the `flex-row` group, and does not
			 * shrink. In a narrow group the panel gives up the width, and the clipped
			 * cross axis does not cut a tab label.
			 */
			scroll: {
				base: ['scrollbar-none', '[&::-webkit-scrollbar]:hidden'],
				orientation: {
					horizontal: [...rail],
					vertical: 'shrink-0 overflow-y-auto overflow-x-hidden',
				},
			},
			tab: {
				base: [
					'relative',
					flex.row,
					weight.medium,
					text.muted,
					fg.current,
					// Tab-specific intermediate hover on non-current siblings.
					...mode(
						'not-data-current:not-disabled:not-data-disabled:hover:text-zinc-700',
						'dark:not-data-current:not-disabled:not-data-disabled:hover:text-zinc-200',
					),
					focus.indicator,
					...disabled,
					'outline-none',
					'whitespace-nowrap',
					// The tab is a headless Button, which drops the `select-none` of the button
					// recipe. A long press on iOS selects the label text without this, and iOS
					// Safari can select the text in a child of a `select-none` tab.
					'select-none *:select-none',
					...cursor,
					'after:absolute after:rounded-full',
					'after:bg-transparent',
					// Inset, because the scroll viewport clips the cross axis.
					...forced.ring.inset,
					// Padding, text, the icon slot, and the gap follow the nearest density scope.
					ji.ramp,
					...narabi.item,
					dan.gap.item,
				],
				orientation: {
					horizontal: [
						'after:inset-x-0 after:-bottom-px after:h-0.5',
						dan.space.tab.x,
						dan.space.tab.bottom,
					],
					vertical: [
						'after:inset-y-0 after:-inset-s-px after:w-0.5',
						dan.space.tab.vertical.x,
						dan.space.tab.vertical.y,
					],
				},
			},
			indicator: {
				base: [rounded.full, ...mode('bg-zinc-950', 'dark:bg-white'), forced.mark],
				orientation: {
					horizontal: 'inset-x-0 -bottom-px top-auto h-0.5',
					vertical: 'inset-y-0 -inset-s-px inset-e-auto w-0.5',
				},
			},
			/** The positioning wrapper around each trigger. It holds the active indicator. */
			wrapper: {
				base: 'group relative',
				stretch: { true: 'flex-1', false: '' },
			},
			/** The trigger chrome that the `tab` and `segment.item` surfaces layer over. */
			trigger: {
				base: 'relative z-1',
				stretch: { true: 'w-full justify-center', false: '' },
			},
			/**
			 * The tab panel surface. A panel with no focusable content joins the tab
			 * order (`tabIndex=0`, per the APG tabs pattern). Keyboard users can then
			 * reach and scroll it. The design-system blue focus ring replaces the
			 * browser default when it takes focus. The ring is `:focus-visible`-gated, so
			 * a panel that holds its own focusable content (and is never tabbable) never
			 * shows it.
			 */
			panel: { base: focus.ring },
		},
		defaults: { orientation: 'horizontal', stretch: false },
	},
	{
		segment,
		// Two units flow through this kata: the underline tab list and the
		// segment box behind `<Segment>`.
		skeleton: {
			tab: kokkaku.tabs.tab,
			gap: kokkaku.tabs.gap,
			segment: kokkaku.segment,
		},
	},
)

/** The size scale of {@link Tabs} and {@link Segment}: the steps of the tab text, padding, and silhouette. */
export const scale = defineScale(
	ji.ramp,
	dan.space.tab.x,
	dan.space.tab.bottom,
	dan.space.tab.vertical.x,
	dan.space.tab.vertical.y,
	dan.size.segment.base,
)
