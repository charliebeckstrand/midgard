import { iro, ji, type Step, sun } from '../kiso'

const { text } = iro
const { size } = ji

/**
 * Card-side projections onto its direct `data-slot=card-*` children. Header
 * and footer carry none of their own spacing — like the body, they're static
 * leaves that can't read `size` — so the card is the single source for the
 * header's gap to the body (`pb`), the footer's gap from the body (`pt`), and
 * the footer's own action-row gap (one step tighter than `ma.gap`, so actions
 * sit close). Direct-child selectors keep nested cards independent.
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

export const k = {
	slots,
	radius,
	header: text.default,
	description: [size.sm, text.muted],
} as const
