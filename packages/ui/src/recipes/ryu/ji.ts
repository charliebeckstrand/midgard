/**
 * Ji (字) — Type.
 *
 * Typography size scale (font-size with line-height bundled).
 *
 * Weight / tracking / family helpers were removed after audit — every
 * consumer used the Tailwind utility directly (`font-semibold`,
 * `tracking-tight`, etc.) instead of routing through the recipe.
 *
 * Layer: ryū · Concern: typography
 */

export const ji = {
	size: {
		xs: 'text-xs',
		sm: 'text-sm',
		md: 'text-base',
		lg: 'text-lg',
		xl: 'text-xl',
		'2xl': 'text-2xl',
		'3xl': 'text-3xl',
		'4xl': 'text-4xl',
	},
} as const

export type JiSize = keyof typeof ji.size
