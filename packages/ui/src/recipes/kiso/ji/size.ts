/**
 * Ji size: type-size scale. Each step bundles `font-size` with its
 * matching `line-height` per the Tailwind named scale.
 *
 * Layer: kiso · Concern: type size
 */

export const size = {
	xs: 'text-xs',
	sm: 'text-sm',
	md: 'text-base',
	lg: 'text-lg',
	xl: 'text-xl',
	'2xl': 'text-2xl',
	'3xl': 'text-3xl',
	'4xl': 'text-4xl',
} as const

/**
 * The three-step size axis (`sm`, `md`, `lg`) of the kata that stop short of
 * the full scale. Each step reads its class from {@link size}.
 */
export const stepSize = { sm: size.sm, md: size.md, lg: size.lg } as const

/**
 * {@link stepSize} in a stepped `density-text` class. The text takes the step of
 * its nearest density scope, and each outer step takes the class of its
 * neighbor. `ji-text-ramp.test.ts` pins it to {@link stepSize}.
 */
export const textRamp = 'density-text-[sm,base,lg]'
