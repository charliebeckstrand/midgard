/**
 * Ma stops — the raw `--spacing` numerals shared by every spacing axis.
 * `padding`, `margin`, and `gap` compose finished utilities by indexing
 * into this label set. Consumers that need bare tokens for arbitrary-value
 * construction reach this directly.
 *
 * Layer: kiso · Concern: spacing scale
 */

export const stops = {
	xs: '1',
	sm: '2',
	md: '3',
	lg: '4',
	xl: '6',
} as const

export type Ma = keyof typeof stops
