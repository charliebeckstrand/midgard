/**
 * Iro bare — colour at the muted text shade with a darken-on-hover.
 * Used for the lightest-weight interactive text (e.g. inline link in
 * body copy). Distinct from `plain` in that the bare text starts at the
 * muted shade and emphasises on hover.
 *
 * Layer: kiso · Concern: bare palette
 */

import { shades } from '../../../core/recipe'

export const bare = {
	text: shades({
		zinc: ['text-zinc-500', 'dark:text-zinc-400'],
		red: ['text-red-600', 'dark:text-red-500'],
		amber: ['text-amber-600', 'dark:text-amber-500'],
		green: ['text-green-600', 'dark:text-green-500'],
		blue: ['text-blue-600', 'dark:text-blue-500'],
	}),
	hover: shades({
		zinc: ['not-disabled:hover:text-zinc-950', 'dark:not-disabled:hover:text-white'],
		red: ['not-disabled:hover:text-red-700', 'dark:not-disabled:hover:text-red-400'],
		amber: ['not-disabled:hover:text-amber-700', 'dark:not-disabled:hover:text-amber-400'],
		green: ['not-disabled:hover:text-green-700', 'dark:not-disabled:hover:text-green-400'],
		blue: ['not-disabled:hover:text-blue-700', 'dark:not-disabled:hover:text-blue-400'],
	}),
}
