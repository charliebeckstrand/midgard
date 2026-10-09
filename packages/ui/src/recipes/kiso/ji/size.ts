/**
 * Ji size: type-size scale. Each step bundles `font-size` with its
 * matching `line-height` per the Tailwind named scale. `2xs` is the 10 px
 * size of `ui/tailwind.css`.
 *
 * Layer: kiso · Concern: type size
 */

import { dan } from '../dan'

export const size = {
	'2xs': 'text-2xs',
	xs: 'text-xs',
	sm: 'text-sm',
	md: 'text-base',
	lg: 'text-lg',
	xl: 'text-xl',
	'2xl': 'text-2xl',
	'3xl': 'text-3xl',
	'4xl': 'text-4xl',
	'5xl': 'text-5xl',
} as const

/**
 * The `xs` to `xl` classes of {@link size} in a stepped `density-text` class.
 * The text takes the step of its nearest density scope.
 * `ji-text-ramp.test.ts` pins it to {@link size}.
 */
export const ramp = dan.text.body
