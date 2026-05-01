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
		xs: 'text-xs/4',
		sm: 'text-sm/5',
		md: 'text-base/6',
		lg: 'text-lg/7',
		xl: 'text-xl/8',
		'2xl': 'text-2xl/9',
		'3xl': 'text-3xl/10',
		'4xl': 'text-4xl/11',
	},
} as const

export type JiSize = keyof typeof ji.size
