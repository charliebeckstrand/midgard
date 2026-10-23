/**
 * Timeline kata: the unit of `<Timeline>`. The root slot is the list, and the
 * `item`, `marker`, `dot`, `title`, `description`, and `timestamp` slots are
 * the parts of a row. Each has an `orientation` axis. The `lineBefore` and
 * `lineAfter` axes of `marker` paint the connector rails, and `color` is the
 * fill of a decorative dot in each hue. `skeleton` is the form of the
 * `TimelineSkeleton` rows.
 */
import { type Color, defineKata, type VariantProps } from '../../core/recipe'
import { dan, iro, ji, kokkaku, omote, ugoki } from '../kiso'
import type { SwatchVariants } from './swatch'

const { marker, text } = iro
const { weight } = ji
const { rail } = omote
const { css } = ugoki

/**
 * The rail into the marker in each hue, at the `iro.marker` shade of the dot.
 * That shade clears non-text 3:1 on the page. The zinc rail is a subtle
 * structural rail. The `before:` and `after:` prefixes are literal classes,
 * because the scanner of Tailwind finds only literal strings.
 */
const lineBefore = {
	zinc: 'before:bg-zinc-200 dark:before:bg-zinc-700',
	red: 'before:bg-red-600 dark:before:bg-red-500',
	amber: 'before:bg-amber-600 dark:before:bg-amber-500',
	green: 'before:bg-green-600 dark:before:bg-green-500',
	blue: 'before:bg-blue-600 dark:before:bg-blue-500',
} as const satisfies Record<Color, string>

/** The rail out of the marker in each hue, as `lineBefore` gives the rail into it. */
const lineAfter = {
	zinc: 'after:bg-zinc-200 dark:after:bg-zinc-700',
	red: 'after:bg-red-600 dark:after:bg-red-500',
	amber: 'after:bg-amber-600 dark:after:bg-amber-500',
	green: 'after:bg-green-600 dark:after:bg-green-500',
	blue: 'after:bg-blue-600 dark:after:bg-blue-500',
} as const satisfies Record<Color, string>

/** The fill of a decorative dot in each hue: the `iro.marker` shade. */
const color = {
	zinc: marker.zinc,
	red: marker.red,
	amber: marker.amber,
	green: marker.green,
	blue: marker.blue,
} satisfies Record<Color, string[]>

export const k = defineKata(
	{
		base: 'list-none p-0 m-0',
		orientation: {
			vertical: 'flex flex-col',
			// The row scrolls in the list. While it overflows, the edge with more
			// content behind it fades, and the list is a tab stop with an inset ring.
			horizontal: ['flex flex-row', ...rail],
		},
		slots: {
			/**
			 * The item spacing and the text take the step of the nearest density scope.
			 * At `md` an item is `pb-8` (`pt-8` when horizontal) with a `gap-x-4` column
			 * gap, a `text-lg` title, a `text-base` description, and a `text-sm`
			 * timestamp. The marker and the gap between horizontal columns keep one size.
			 */
			item: {
				base: 'relative overflow-hidden',
				orientation: {
					vertical: [
						'grid grid-cols-[0.875rem_1fr]',
						dan.gap.timeline.x,
						`${dan.space.timeline.bottom} last:pb-0`,
					],
					// 6.5px aligns the content with the rail. It matches the marker's `inset-s-[6.5px]`.
					// The minimum width stops a column at a readable measure; past it, the
					// row scrolls in the list.
					horizontal: ['flex flex-col min-w-48 ps-[6.5px] pe-8 last:pe-0', dan.space.timeline.top],
				},
			},
			marker: {
				base: [
					'z-10 relative inline-flex size-3.5 items-center justify-center',
					// Line segments anchor to the marker and are clipped to the item via
					// overflow-hidden; adjacent items meet at the shared edge.
					'before:content-[""] before:absolute',
					'after:content-[""] after:absolute',
					// First item has no inbound line; last item has no outbound line.
					'[li:first-child_&]:before:hidden',
					'[li:last-child_&]:after:hidden',
					// The rails are only backgrounds, which forced colors remove. They paint
					// in CanvasText, as a `sen.forced.shape` does.
					'forced-colors:before:bg-[CanvasText] forced-colors:after:bg-[CanvasText]',
				],
				orientation: {
					vertical: [
						'col-start-1 row-start-1 self-center justify-self-center',
						'before:bottom-full before:left-1/2 before:-translate-x-1/2',
						'before:h-screen before:w-0.5',
						'after:top-full after:left-1/2 after:-translate-x-1/2',
						'after:h-screen after:w-0.5',
					],
					horizontal: [
						// inset-s-[6.5px] centers the rail on the marker.
						'absolute top-0 inset-s-[6.5px]',
						'before:inset-e-full before:top-1/2 before:-translate-y-1/2',
						'before:h-0.5 before:w-screen',
						'after:inset-s-full after:top-1/2 after:-translate-y-1/2',
						'after:h-0.5 after:w-screen',
					],
				},
				lineBefore,
				lineAfter,
				slots: {
					// The inner dot (a StatusDot or a decorative Swatch) fills the marker box
					// and rides above the connector rails.
					dot: {
						base: 'z-10 relative size-full',
						/** The pulse animation of a decorative dot. A StatusDot pulses itself. */
						pulse: {
							true: css.pulse,
							false: '',
						},
					},
				},
			},
			title: {
				base: [weight.semibold, dan.text.title, ...text.default],
				orientation: {
					vertical: 'col-start-2 row-start-1',
					horizontal: 'order-1',
				},
			},
			description: {
				base: [ji.ramp],
				orientation: {
					vertical: 'col-start-2 row-start-2',
					horizontal: 'order-2',
				},
			},
			timestamp: {
				base: [dan.text.small, ...text.muted],
				orientation: {
					vertical: 'col-start-2 row-start-3 mt-1',
					horizontal: 'order-3 mt-1',
				},
			},
		},
		defaults: { orientation: 'vertical', lineBefore: 'zinc', lineAfter: 'zinc', pulse: false },
	},
	{ color, skeleton: kokkaku.timeline },
)

/** Recipe variant props for {@link Timeline}: the styling axes its kata exposes (`orientation`, `variant`), for consumers composing custom slots. */
export type TimelineVariants = {
	/** The axis of the timeline. @defaultValue 'vertical' */
	orientation?: VariantProps<typeof k>['orientation']
	/**
	 * The style of the markers and the connector lines: the `solid` or the
	 * `outline` fill of {@link Swatch}. The root takes no class for it.
	 * @defaultValue 'solid'
	 */
	variant?: Extract<SwatchVariants['variant'], 'solid' | 'outline'>
}
