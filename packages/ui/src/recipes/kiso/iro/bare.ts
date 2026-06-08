/**
 * Iro bare — colour at the muted text shade with a darken-on-hover.
 * Renders at the ramp's `onSurface` role at rest and steps to `onTint`
 * (the max-emphasis neutral for zinc) on hover, written as full literals
 * for Tailwind's scanner.
 *
 * Layer: kiso · Concern: bare palette
 */

import { shades } from '../../../core/recipe'

import { onSurface } from './ramp'

export const bare = {
	text: onSurface,
	hover: shades({
		zinc: ['not-disabled:hover:text-zinc-950', 'dark:not-disabled:hover:text-white'],
		red: ['not-disabled:hover:text-red-700', 'dark:not-disabled:hover:text-red-400'],
		amber: ['not-disabled:hover:text-amber-800', 'dark:not-disabled:hover:text-amber-400'],
		green: ['not-disabled:hover:text-green-800', 'dark:not-disabled:hover:text-green-400'],
		blue: ['not-disabled:hover:text-blue-700', 'dark:not-disabled:hover:text-blue-400'],
	}),
}
