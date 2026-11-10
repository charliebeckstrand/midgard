/**
 * Omote backdrop: modal / sheet overlay fills. `base` is the default modal
 * scrim. `axis` is the `surface` axis of the backdrop of a modal panel: its
 * `flat` half is `base`, and its `glass` half is denser for use behind a glass
 * panel. The raw color pairs live here, not in `bg.ts`; the `blur` filter is
 * its own concern.
 *
 * The `flat` half also holds the `glass` scrim behind the `surfaces-glass`
 * variant, for the paint before hydration while the reader chose glass
 * surfaces (see `panel.ts`).
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
	axis: {
		glass: fill.lg,
		flat: [
			fill.md,
			blur.sm,
			...mode('surfaces-glass:bg-white/75', 'dark:surfaces-glass:bg-zinc-950/75'),
			'surfaces-glass:backdrop-blur-none',
		],
	},
} as const
