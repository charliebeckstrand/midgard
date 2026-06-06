/**
 * Iro text — the per-colour text shade shared by the `plain`, `soft`,
 * and `outline` palette variants. One source of truth so the
 * colour-axis shade can be tweaked without touching the palettes that
 * compose it.
 *
 * The semantic intent-colour bundle (`default` / `muted` / `primary`
 * / `success` / `warning` / `error`) — the public `iro.text` — lives
 * next door in `intent.ts` and the barrel composes it under the `text`
 * key.
 *
 * Layer: kiso · Concern: text shade
 */

import { shades } from '../../../core/recipe'

export const text = shades({
	zinc: ['text-zinc-700', 'dark:text-zinc-400'],
	red: ['text-red-700', 'dark:text-red-400'],
	amber: ['text-amber-800', 'dark:text-amber-400'],
	green: ['text-green-800', 'dark:text-green-400'],
	blue: ['text-blue-700', 'dark:text-blue-400'],
})
