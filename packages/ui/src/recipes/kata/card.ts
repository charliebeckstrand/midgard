import { defineRecipe } from '../../core/recipe'
import { iro, ji, kasane, ma, type Step, sun } from '../kiso'

const { text } = iro
const { size } = ji
const { rounded } = kasane
const { p } = ma

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

/**
 * The card frame: its padding, its radius, and its {@link slots} row for each
 * step. An omitted `size` follows the nearest density scope, and `md` outside
 * one.
 */
const frame = defineRecipe({
	size: {
		sm: [p.sm, rounded[sun.sm.radius], slots.sm],
		md: [p.md, rounded[sun.md.radius], slots.md],
		lg: [p.lg, rounded[sun.lg.radius], slots.lg],
	},
	defaults: { size: 'md' },
	densityAxis: 'size',
})

export const k = {
	frame,
	header: text.default,
	description: [size.sm, text.muted],
} as const
