/**
 * Ji (字) — Type.
 *
 * Typography — size (with line-height), weight, tracking, family.
 *
 * Tier: 1 · Concern: typography
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

	weight: {
		normal: 'font-normal',
		medium: 'font-medium',
		semibold: 'font-semibold',
		bold: 'font-bold',
	},

	tracking: {
		tight: 'tracking-tight',
		normal: 'tracking-normal',
		wide: 'tracking-wide',
	},

	family: {
		sans: 'font-sans',
		mono: 'font-mono',
	},
} as const

export type JiSize = keyof typeof ji.size
export type JiWeight = keyof typeof ji.weight
