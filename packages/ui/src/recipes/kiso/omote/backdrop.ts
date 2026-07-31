/**
 * Omote backdrop: modal / sheet overlay fills. Two intensities: `base`
 * is the default modal scrim; `glass` is denser for use behind a glass
 * panel. Both are translucent, so `grayscale` rides on top of either to
 * drain the colour from what still shows through, leaving it inert rather
 * than merely dimmed. The raw colour pairs live here, not in `bg.ts`; the
 * two filters are their own concerns (`blur`, `grayscale`).
 *
 * Layer: kiso · Concern: backdrop fill
 */

import { mode } from '../../../core/recipe'

import { blur } from './blur'
import { grayscale } from './grayscale'

const fill = {
	md: mode('bg-white/50', 'dark:bg-zinc-950/50'),
	lg: mode('bg-white/75', 'dark:bg-zinc-950/75'),
} as const

export const backdrop = {
	base: [fill.md, blur.sm],
	glass: fill.lg,
	grayscale,
} as const
