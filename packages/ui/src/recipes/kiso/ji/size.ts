/**
 * Ji size: type-size scale. Each step bundles `font-size` with its
 * matching `line-height` per the Tailwind named scale.
 *
 * Layer: kiso · Concern: type size
 */

import { dan } from '../dan'

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
 * The `sm`, `md`, and `lg` classes of {@link size} in a stepped `density-text`
 * class. The text takes the step of its nearest density scope, and each outer
 * step takes the class of its neighbor. `ji-text-ramp.test.ts` pins it to
 * {@link size}.
 */
export const textRamp = dan.text.body
