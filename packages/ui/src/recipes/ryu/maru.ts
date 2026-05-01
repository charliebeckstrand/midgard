/**
 * Maru (丸) — Roundness.
 *
 * Border-radius scale. Substrate for `sun.radius` and the few kata that
 * step outside the size system.
 *
 * Layer: ryū · Concern: shape
 */

export const maru = {
	rounded: {
		none: 'rounded-none',
		sm: 'rounded-sm',
		md: 'rounded-md',
		lg: 'rounded-lg',
		xl: 'rounded-xl',
		full: 'rounded-full',
	},
} as const
