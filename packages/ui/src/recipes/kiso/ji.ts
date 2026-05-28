/**
 * Ji (字) — typography.
 *
 * Type-size scale (`size`) keyed by label, font-weight aliases
 * (`weight`), line-height aliases (`leading`), and the family map
 * (`family`). The bare `ji` const carries `size` keys at the top level
 * for the dominant use case; weight / leading / family flow through
 * named sub-objects so consumers reach finished class strings by name
 * instead of inlining `'font-semibold'` / `'leading-tight'` / etc.
 *
 * Layer: kiso · Concern: typography
 */

const size = {
	xs: 'text-xs',
	sm: 'text-sm',
	md: 'text-base',
	lg: 'text-lg',
	xl: 'text-xl',
	'2xl': 'text-2xl',
	'3xl': 'text-3xl',
	'4xl': 'text-4xl',
} as const

const weight = {
	normal: 'font-normal',
	medium: 'font-medium',
	semibold: 'font-semibold',
	bold: 'font-bold',
} as const

const leading = {
	none: 'leading-none',
	tight: 'leading-tight',
	normal: 'leading-normal',
	relaxed: 'leading-relaxed',
} as const

const family = {
	sans: 'font-sans',
	mono: 'font-mono',
	serif: 'font-serif',
} as const

export const ji = {
	...size,
	size,
	weight,
	leading,
	family,
} as const

export type Ji = keyof typeof size
