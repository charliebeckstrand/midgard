/**
 * Omote bg — the colour pairs (`light`/`dark`) every surface concern
 * composes with its chrome. Lives separately so surface / popover /
 * tint / skeleton share one source of truth. Backdrop fills live with
 * the backdrop chrome in `backdrop.ts` — no other surface composes
 * them.
 *
 * Layer: kiso · Concern: surface fills
 */

import { mode } from '../../../core/recipe'

export const bg = {
	surface: mode('bg-white', 'dark:bg-zinc-900'),
	popover: mode('bg-white/90', 'dark:bg-zinc-800/75'),
	tint: mode('bg-zinc-950/5', 'dark:bg-white/10'),
	skeleton: mode('bg-zinc-200', 'dark:bg-zinc-700'),
	/** Code-block canvas — matches the shiki `github-dark` theme; fixed across colour modes. */
	code: 'bg-[#0d1117]',
} as const
