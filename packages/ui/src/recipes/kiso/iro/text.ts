/**
 * Iro text — semantic text-colour bundle and the per-colour text shades
 * shared by every palette variant. `text` is the colour-axis map keyed
 * by the library's `Color` axis; `intent` is the semantic bundle
 * (default / primary / success / warning / error / muted) consumers
 * reach by purpose rather than colour.
 *
 * Layer: kiso · Concern: text colour
 */

import { mode, shades } from '../../../core/recipe'

export const text = shades({
	zinc: ['text-zinc-700', 'dark:text-zinc-400'],
	red: ['text-red-700', 'dark:text-red-400'],
	amber: ['text-amber-700', 'dark:text-amber-400'],
	green: ['text-green-700', 'dark:text-green-400'],
	blue: ['text-blue-700', 'dark:text-blue-400'],
})

export const intent = {
	default: mode('text-zinc-950', 'dark:text-white'),
	primary: mode('text-blue-600', 'dark:text-blue-500'),
	success: mode('text-green-600', 'dark:text-green-500'),
	warning: mode('text-amber-600', 'dark:text-amber-500'),
	error: mode('text-red-600', 'dark:text-red-500'),
	muted: mode('text-zinc-500', 'dark:text-zinc-400'),
}
