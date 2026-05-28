/**
 * Omote backdrop — modal / sheet overlay fills. Two intensities: `base`
 * is the default modal scrim; `glass` is denser for use behind a glass
 * panel that would otherwise read transparent against the page. The
 * raw colour pairs live here (not in `bg.ts`) because nothing else
 * composes them.
 *
 * Layer: kiso · Concern: backdrop fill
 */

import { mode } from '../../../core/recipe'

import { blur } from './blur'

const fill = {
	md: mode('bg-white/50', 'dark:bg-zinc-950/50'),
	lg: mode('bg-white/75', 'dark:bg-zinc-950/75'),
} as const

export const backdrop = {
	base: [fill.md, blur.sm],
	glass: fill.lg,
} as const
