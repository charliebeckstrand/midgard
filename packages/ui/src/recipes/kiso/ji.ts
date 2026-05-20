/**
 * Ji (字) — typography.
 *
 * Type-size scale: font-size with line-height bundled. Weight, tracking, and
 * family use the Tailwind utility directly (`font-semibold`,
 * `tracking-tight`, …) rather than routing through the recipe.
 *
 * Layer: kiso · Concern: typography
 */

export const ji = {
	xs: 'text-xs',
	sm: 'text-sm',
	md: 'text-base',
	lg: 'text-lg',
	xl: 'text-xl',
	'2xl': 'text-2xl',
	'3xl': 'text-3xl',
	'4xl': 'text-4xl',
} as const

export type Ji = keyof typeof ji
