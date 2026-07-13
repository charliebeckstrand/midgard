import { type Color, defineRecipe, type VariantProps } from '../../core/recipe'
import { iro, ji } from '../kiso'

const { marker, text } = iro
const { size, weight } = ji

/**
 * Per-colour marker appearance. `dot` uses the `iro.marker` shade (600 light /
 * 500 dark), clearing non-text 3:1 on the page; `line.before` / `line.after`
 * paint the inbound / outbound rail at the same shade (neutral uses a subtle
 * structural rail). The `before:` / `after:` prefixes are verbatim class
 * literals: Tailwind's scanner requires literal strings for class discovery.
 */
const palette = {
	neutral: {
		dot: marker.neutral,
		line: {
			before: 'before:bg-neutral-200 dark:before:bg-neutral-700',
			after: 'after:bg-neutral-200 dark:after:bg-neutral-700',
		},
	},
	danger: {
		dot: marker.danger,
		line: {
			before: 'before:bg-danger-600 dark:before:bg-danger-500',
			after: 'after:bg-danger-600 dark:after:bg-danger-500',
		},
	},
	warning: {
		dot: marker.warning,
		line: {
			before: 'before:bg-warning-600 dark:before:bg-warning-500',
			after: 'after:bg-warning-600 dark:after:bg-warning-500',
		},
	},
	success: {
		dot: marker.success,
		line: {
			before: 'before:bg-success-600 dark:before:bg-success-500',
			after: 'after:bg-success-600 dark:after:bg-success-500',
		},
	},
	primary: {
		dot: marker.primary,
		line: {
			before: 'before:bg-primary-600 dark:before:bg-primary-500',
			after: 'after:bg-primary-600 dark:after:bg-primary-500',
		},
	},
} satisfies Record<Color, { dot: string[]; line: { before: string; after: string } }>

const root = defineRecipe({
	base: ['list-none p-0 m-0'],
	orientation: {
		vertical: 'flex flex-col',
		horizontal: 'flex flex-row overflow-x-auto',
	},
	variant: {
		solid: '',
		outline: '',
	},
	defaults: { orientation: 'vertical', variant: 'solid' },
})

const item = defineRecipe({
	base: 'relative overflow-hidden',
	orientation: {
		vertical: 'grid grid-cols-[0.875rem_1fr] gap-x-4 pb-8 last:pb-0',
		// 6.5px centers content on the rail: half the 14px marker minus half the 2px rail.
		horizontal: 'flex flex-col pl-[6.5px] pt-8 pr-8 last:pr-0',
	},
	defaults: { orientation: 'vertical' },
})

const title = defineRecipe({
	base: [weight.semibold, size.lg, ...text.default],
	orientation: {
		vertical: 'col-start-2 row-start-1',
		horizontal: 'order-1',
	},
	defaults: { orientation: 'vertical' },
})

const description = defineRecipe({
	base: [size.md],
	orientation: {
		vertical: 'col-start-2 row-start-2',
		horizontal: 'order-2',
	},
	defaults: { orientation: 'vertical' },
})

const timestamp = defineRecipe({
	base: [size.sm, ...text.muted],
	orientation: {
		vertical: 'col-start-2 row-start-3 mt-1',
		horizontal: 'order-3 mt-1',
	},
	defaults: { orientation: 'vertical' },
})

export const k = {
	root,
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
} as const

/** Recipe variant props for {@link Timeline} — the styling axes its kata exposes (`orientation`, `variant`), for consumers composing custom slots. */
export type TimelineVariants = VariantProps<typeof root>
