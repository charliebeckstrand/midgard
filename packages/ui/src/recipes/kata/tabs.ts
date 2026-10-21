/**
 * Tabs kata: serves both the underline `<Tabs>` list and the `<Segment>` box,
 * two units through one surface. One recipe builds the parts of the underline
 * tabs. Its root part `base` is the tab group, and the `orientation` and
 * `stretch` axes give classes to the parts that they change. `segment` reads
 * the kiso segment recipe, which Segment and Tabs share through this kata, and
 * `skeleton` carries a loading placeholder for each unit.
 */
import { defineScale } from '../../core/density'
import { defineRecipe, mode } from '../../core/recipe'
import { hannou, iro, ji, kasane, kokkaku, narabi, omote, sen } from '../kiso'
import { dan } from '../kiso/dan'
import { segment } from '../kiso/segment'

const { cursor, disabled, fg } = hannou
const { text } = iro
const { weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { rail } = omote
const { border, focus, forced } = sen

export const k = defineRecipe(
	{
		/** The tab group: it stacks the list and the panels, and the orientation sets its axis. */
		base: ['flex', dan.gap.scale.lg],
		parts: {
			/**
			 * The underline list, which draws the baseline rail (`border-b` /
			 * `border-s`) that the tabs sit on. A horizontal list sizes to
			 * `max-content` (never below `100%`), so the rail spans the full scroll
			 * width. A block-level flex box otherwise fills only the viewport, which
			 * clips the rail there and strands overflowed tabs above bare space. A
			 * vertical list needs no counterpart: an auto-height column already grows
			 * to its content, so `border-s` runs the full length of every stacked tab.
			 */
			list: ['flex', ...border.color.subtle],
			/**
			 * The overflow viewport around the underline list: an over-long tab row
			 * scrolls within it instead of widening the page. The cross axis stays
			 * clipped: the active-indicator/focus rail sits flush with the content
			 * edge, so nothing is lost. The native scrollbar is hidden, so it never
			 * crosses the rail. The active tab scrolls into view, and roving keeps
			 * every tab reachable. While a horizontal row overflows, the edge with
			 * more tabs behind it fades.
			 *
			 * A vertical list sits beside the panel in the `flex-row` group, and does
			 * not shrink. In a narrow group the panel gives up the width, and the
			 * clipped cross axis does not cut a tab label.
			 */
			scroll: ['scrollbar-none', '[&::-webkit-scrollbar]:hidden'],
			tab: [
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
			indicator: [rounded.full, ...mode('bg-zinc-950', 'dark:bg-white'), forced.mark],
			/** The positioning wrapper around each trigger. It holds the active indicator. */
			wrapper: 'group relative',
			/** The trigger chrome that the `tab` and `segment.item` surfaces layer over. */
			trigger: 'relative z-1',
			/**
			 * The tab panel surface. A panel with no focusable content joins the tab
			 * order (`tabIndex=0`, per the APG tabs pattern). Keyboard users can then
			 * reach and scroll it. The design-system blue focus ring replaces the
			 * browser default when it takes focus. The ring is `:focus-visible`-gated,
			 * so a panel that holds its own focusable content (and is never tabbable)
			 * never shows it.
			 */
			panel: focus.ring,
		},
		orientation: {
			horizontal: {
				base: 'flex-col',
				list: ['border-b', 'w-max', 'min-w-full'],
				scroll: [...rail],
				tab: [
					'after:inset-x-0 after:-bottom-px after:h-0.5',
					dan.space.tab.x,
					dan.space.tab.bottom,
				],
				indicator: 'inset-x-0 -bottom-px top-auto h-0.5',
			},
			vertical: {
				base: 'flex-row',
				list: ['flex-col', 'border-s'],
				scroll: 'shrink-0 overflow-y-auto overflow-x-hidden',
				tab: [
					'after:inset-y-0 after:-inset-s-px after:w-0.5',
					dan.space.tab.vertical.x,
					dan.space.tab.vertical.y,
				],
				indicator: 'inset-y-0 -inset-s-px inset-e-auto w-0.5',
			},
		},
		stretch: {
			true: { wrapper: 'flex-1', trigger: 'w-full justify-center' },
			false: {},
		},
		defaults: { orientation: 'horizontal', stretch: false },
		// Two units flow through this kata: the underline tab list and the
		// segment box behind `<Segment>`.
		skeleton: {
			tab: kokkaku.tabs.tab,
			gap: kokkaku.tabs.gap,
			segment: kokkaku.segment,
		},
	},
	{ segment },
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
