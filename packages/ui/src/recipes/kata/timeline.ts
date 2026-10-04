import { type Color, defineRecipe, type VariantProps } from '../../core/recipe'
import { iro, ji, kokkaku, omote, ugoki } from '../kiso'
import { dan } from '../kiso/dan'

const { marker, text } = iro
const { weight } = ji
const { rail } = omote
const { css } = ugoki

/**
 * Per-color marker appearance. `dot` uses the `iro.marker` shade, which clears
 * non-text 3:1 on the page. That is 600 light / 500 dark, and 500 / 400 for zinc. `line.before` / `line.after`
 * paint the inbound / outbound rail at the same shade (zinc uses a subtle
 * structural rail). The `before:` / `after:` prefixes are verbatim class
 * literals: Tailwind's scanner requires literal strings for class discovery.
 */
const palette = {
	zinc: {
		dot: marker.zinc,
		line: {
			before: 'before:bg-zinc-200 dark:before:bg-zinc-700',
			after: 'after:bg-zinc-200 dark:after:bg-zinc-700',
		},
	},
	red: {
		dot: marker.red,
		line: {
			before: 'before:bg-red-600 dark:before:bg-red-500',
			after: 'after:bg-red-600 dark:after:bg-red-500',
		},
	},
	amber: {
		dot: marker.amber,
		line: {
			before: 'before:bg-amber-600 dark:before:bg-amber-500',
			after: 'after:bg-amber-600 dark:after:bg-amber-500',
		},
	},
	green: {
		dot: marker.green,
		line: {
			before: 'before:bg-green-600 dark:before:bg-green-500',
			after: 'after:bg-green-600 dark:after:bg-green-500',
		},
	},
	blue: {
		dot: marker.blue,
		line: {
			before: 'before:bg-blue-600 dark:before:bg-blue-500',
			after: 'after:bg-blue-600 dark:after:bg-blue-500',
		},
	},
} satisfies Record<Color, { dot: string[]; line: { before: string; after: string } }>

const timeline = defineRecipe({
	base: ['list-none p-0 m-0'],
	orientation: {
		vertical: 'flex flex-col',
		// The row scrolls in the list. While it overflows, the edge with more
		// content behind it fades, and the list is a tab stop with an inset ring.
		horizontal: ['flex flex-row', ...rail],
	},
	variant: {
		solid: '',
		outline: '',
	},
	defaults: { orientation: 'vertical', variant: 'solid' },
})

/**
 * The item spacing and the text take the step of the nearest density scope.
 * At `md` an item is `pb-8` (`pt-8` when horizontal) with a `gap-x-4` column
 * gap, a `text-lg` title, a `text-base` description, and a `text-sm`
 * timestamp. The marker and the gap between horizontal columns keep one size.
 */
const item = defineRecipe({
	base: 'relative overflow-hidden',
	orientation: {
		vertical: [
			'grid grid-cols-[0.875rem_1fr]',
			dan.gap.timeline.x,
			`${dan.space.timeline.bottom} last:pb-0`,
		],
		// 6.5px aligns the content with the rail. It matches the marker's `left-[6.5px]`.
		// The minimum width stops a column at a readable measure; past it, the
		// row scrolls in the list.
		horizontal: ['flex flex-col min-w-48 pl-[6.5px] pr-8 last:pr-0', dan.space.timeline.top],
	},
	defaults: { orientation: 'vertical' },
})

const title = defineRecipe({
	base: [weight.semibold, dan.text.title, ...text.default],
	orientation: {
		vertical: 'col-start-2 row-start-1',
		horizontal: 'order-1',
	},
	defaults: { orientation: 'vertical' },
})

const description = defineRecipe({
	base: [ji.ramp],
	orientation: {
		vertical: 'col-start-2 row-start-2',
		horizontal: 'order-2',
	},
	defaults: { orientation: 'vertical' },
})

const timestamp = defineRecipe({
	base: [dan.text.small, ...text.muted],
	orientation: {
		vertical: 'col-start-2 row-start-3 mt-1',
		horizontal: 'order-3 mt-1',
	},
	defaults: { orientation: 'vertical' },
})

export const k = {
	base: timeline,
	item,
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
		],
		// The inner dot (a StatusDot or a decorative Swatch) fills the marker box
		// and rides above the connector rails.
		dot: 'z-10 relative size-full',
		/** The pulse animation of a decorative dot, applied when `pulse` is set. A StatusDot pulses itself. */
		pulse: css.pulse,
		vertical: [
			'col-start-1 row-start-1 self-center justify-self-center',
			'before:bottom-full before:left-1/2 before:-translate-x-1/2',
			'before:h-[100vh] before:w-0.5',
			'after:top-full after:left-1/2 after:-translate-x-1/2',
			'after:h-[100vh] after:w-0.5',
		],
		horizontal: [
			// left-[6.5px] centers the rail on the marker.
			'absolute top-0 left-[6.5px]',
			'before:right-full before:top-1/2 before:-translate-y-1/2',
			'before:h-0.5 before:w-[100vw]',
			'after:left-full after:top-1/2 after:-translate-y-1/2',
			'after:h-0.5 after:w-[100vw]',
		],
		palette,
	},
	title,
	description,
	timestamp,
	skeleton: kokkaku.timeline,
} as const

/** Recipe variant props for {@link Timeline} — the styling axes its kata exposes (`orientation`, `variant`), for consumers composing custom slots. */
export type TimelineVariants = VariantProps<typeof k.base>
