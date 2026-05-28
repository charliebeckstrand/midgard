/**
 * Ma stops — the raw `--spacing` numerals shared by every spacing axis.
 * Lives separately so `padding`, `margin`, `gap` can compose finished
 * utilities by indexing into the same label set, and so consumers that
 * need arbitrary-value construction can reach the bare token without
 * pulling in a finished class string.
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
