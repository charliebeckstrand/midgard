/**
 * Omote bg — the colour pairs (`light`/`dark`) every surface concern
 * composes with its chrome. Lives separately so surface / popover /
 * tint / skeleton / backdrop share one source of truth.
 *
 * Layer: kiso · Concern: surface fills
 */

import { mode } from '../../../core/recipe'

export const bg = {
	surface: mode('bg-white', 'dark:bg-zinc-900'),
	popover: mode('bg-white/90', 'dark:bg-zinc-800/75'),
	tint: mode('bg-zinc-950/5', 'dark:bg-white/10'),
	skeleton: mode('bg-zinc-200', 'dark:bg-zinc-700'),
	backdrop: {
		md: mode('bg-white/50', 'dark:bg-zinc-950/50'),
		lg: mode('bg-white/75', 'dark:bg-zinc-950/75'),
	},
} as const
