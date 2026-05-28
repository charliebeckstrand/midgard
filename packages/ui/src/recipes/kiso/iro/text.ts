/**
 * Iro text — the semantic intent-colour bundle. Default text colour plus
 * the named intents (`primary` / `success` / `warning` / `error` /
 * `muted`) that consumers reach by purpose rather than colour axis.
 *
 * Per-colour text shades (the colour-axis source consumed by palette
 * variants) live next door in `tone.ts`.
 *
 * Layer: kiso · Concern: semantic text intent
 */

import { mode } from '../../../core/recipe'

export const text = {
	default: mode('text-zinc-950', 'dark:text-white'),
	primary: mode('text-blue-600', 'dark:text-blue-500'),
	success: mode('text-green-600', 'dark:text-green-500'),
	warning: mode('text-amber-600', 'dark:text-amber-500'),
	error: mode('text-red-600', 'dark:text-red-500'),
	muted: mode('text-zinc-500', 'dark:text-zinc-400'),
}
