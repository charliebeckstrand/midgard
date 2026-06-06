/**
 * Iro bare — colour at the muted text shade with a darken-on-hover.
 * Used for the lightest-weight interactive text (e.g. inline link in
 * body copy). Distinct from `plain` in that the bare text starts at the
 * muted shade and emphasises on hover.
 *
 * Resting text projects the ramp's `onSurface` role (the AA-clean
 * foreground for the page surface, shared with the semantic intent
 * bundle). Hover emphasises one step further, to the ramp's `onTint`
 * chromatic shade (and the max-emphasis neutral for zinc) — written out
 * with the `not-disabled:hover:` state prefix, which Tailwind's scanner
 * needs as a full literal.
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
