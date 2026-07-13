/**
 * Iro bare: colour at the muted text shade with a darken-on-hover.
 * Renders at the ramp's `onSurface` role at rest and steps to `onTint`
 * (the max-emphasis neutral for the neutral role) on hover, written as
 * full literals for Tailwind's scanner.
 *
 * Layer: kiso · Concern: bare palette
 */

import { shades } from '../../../core/recipe'

import { onSurface } from './ramp'

export const bare = {
	text: onSurface,
	hover: shades({
		neutral: ['not-disabled:hover:text-neutral-950', 'dark:not-disabled:hover:text-white'],
		danger: ['not-disabled:hover:text-danger-700', 'dark:not-disabled:hover:text-danger-400'],
		warning: ['not-disabled:hover:text-warning-800', 'dark:not-disabled:hover:text-warning-400'],
		success: ['not-disabled:hover:text-success-800', 'dark:not-disabled:hover:text-success-400'],
		primary: ['not-disabled:hover:text-primary-700', 'dark:not-disabled:hover:text-primary-400'],
	}),
}
