/**
 * Iro tone — the per-colour text shade shared by the `plain`, `soft`,
 * and `outline` palette variants. Lives separately so the three variants
 * read one source of truth and the colour-axis shade can be tweaked
 * without touching the palettes that compose it.
 *
 * Layer: kiso · Concern: text tone
 */

import { shades } from '../../../core/recipe'

export const tone = shades({
	zinc: ['text-zinc-700', 'dark:text-zinc-400'],
	red: ['text-red-700', 'dark:text-red-400'],
	amber: ['text-amber-700', 'dark:text-amber-400'],
	green: ['text-green-700', 'dark:text-green-400'],
	blue: ['text-blue-700', 'dark:text-blue-400'],
})
