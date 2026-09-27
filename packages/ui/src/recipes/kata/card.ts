import { iro, ji, type Step, sun } from '../kiso'

const { text } = iro
const { size } = ji

/**
 * Card-side projections onto its direct `data-slot=card-*` children. Header
 * and footer carry none of their own spacing: like the body, they're static
 * leaves that can't read `size`. The card is therefore the single source for the
 * header's gap to the body (`pb`) and the footer's gap from the body (`pt`). It
 * also owns the footer's own action-row gap (one step tighter than `ma.gap`, so
 * actions sit close). Direct-child selectors keep nested cards independent.
 */
const slots = {
	sm: [
		'*:data-[slot=card-header]:pb-2',
		'*:data-[slot=card-footer]:pt-2',
		'*:data-[slot=card-footer]:gap-1',
	],
	md: [
		'*:data-[slot=card-header]:pb-3',
		'*:data-[slot=card-footer]:pt-3',
		'*:data-[slot=card-footer]:gap-2',
	],
	lg: [
		'*:data-[slot=card-header]:pb-4',
		'*:data-[slot=card-footer]:pt-4',
		'*:data-[slot=card-footer]:gap-3',
	],
} as const satisfies Record<Step, readonly string[]>

const radius = {
	sm: sun.sm.radius,
	md: sun.md.radius,
	lg: sun.lg.radius,
} as const satisfies Record<Step, 'sm' | 'md' | 'lg'>

/**
 * Rows for an unsized card, which follows the nearest density scope
 * (`ui/tailwind.css`). Each row is the card's padding (`ma.p`), its radius,
 * and its {@link slots} row for one step, under the matching `density-*`
 * variant. The md row resets an outer scope. Tailwind scans whole class
 * literals, so the rows can't be built from the source tables.
 * `density-rows.test.ts` keeps them in step.
 */
const density = {
	sm: [
		'density-sm:p-2',
		'density-sm:rounded-sm',
		'density-sm:*:data-[slot=card-header]:pb-2',
		'density-sm:*:data-[slot=card-footer]:pt-2',
		'density-sm:*:data-[slot=card-footer]:gap-1',
	],
	md: [
		'density-md:p-3',
		'density-md:rounded-md',
		'density-md:*:data-[slot=card-header]:pb-3',
		'density-md:*:data-[slot=card-footer]:pt-3',
		'density-md:*:data-[slot=card-footer]:gap-2',
	],
	lg: [
		'density-lg:p-4',
		'density-lg:rounded-lg',
		'density-lg:*:data-[slot=card-header]:pb-4',
		'density-lg:*:data-[slot=card-footer]:pt-4',
		'density-lg:*:data-[slot=card-footer]:gap-3',
	],
} as const satisfies Record<Step, readonly string[]>

export const k = {
	slots,
	radius,
	density,
	header: text.default,
	description: [size.sm, text.muted],
} as const
