/**
 * Omote (面) — surfaces.
 *
 * Named surface chromes — the plane content sits on. The internal `bg`
 * map carries colour tokens keyed by surface role; the exported shape
 * composes them with `sen` lines, blur, and forced-colour fallbacks.
 * Popovers, panels, and backdrops each carry a multi-property chrome
 * that always applies together.
 *
 * Layer: kiso · Concern: surface
 */

import { mode } from '../../core/recipe'

import { sen } from './sen'

const bg = {
	surface: mode('bg-white', 'dark:bg-zinc-900'),
	panel: mode('bg-white', 'dark:bg-zinc-900'),
	popover: mode('bg-white/90', 'dark:bg-zinc-800/75'),
	tint: mode('bg-zinc-950/5', 'dark:bg-white/10'),
	skeleton: mode('bg-zinc-200', 'dark:bg-zinc-700'),
	backdrop: {
		md: mode('bg-white/50', 'dark:bg-zinc-950/50'),
		lg: mode('bg-white/75', 'dark:bg-zinc-950/75'),
	},
}

const blur = {
	sm: 'backdrop-blur-sm',
	md: 'backdrop-blur',
}

export const omote = {
	/** Solid surface background (cards, sidebars, navbars). */
	surface: bg.surface,
	/** Solid panel background (dialogs, sheets, drawers). */
	panel: {
		/** Background fill only. */
		bg: bg.panel,
		/** Chrome only — ring + shadow + forced-colour outline, no fill. */
		chrome: [sen.ring, sen.forced.outline],
		/** Fill + chrome, everything a floating panel needs. */
		base: [sen.ring, sen.forced.outline, bg.panel],
	},
	/** Floating popover surface — translucent fill + ring + blur. */
	popover: [blur.md, bg.popover, sen.ring],
	/** Fully transparent glass surface — blur only. */
	glass: ['bg-transparent', blur.md],
	/** Backdrop fills (modal / sheet overlays). */
	backdrop: {
		base: [bg.backdrop.md, blur.sm],
		glass: bg.backdrop.lg,
	},
	/** Card content block with viewport-dependent chrome. */
	content: ['lg:rounded-lg', 'lg:shadow-xs', 'lg:bg-white', 'dark:lg:bg-zinc-900'],
	/** Subtle tinted overlay — used for raised / striped rows. */
	tint: bg.tint,
	/** Loading skeleton background. */
	skeleton: [bg.skeleton, 'animate-pulse'],
	/** Backdrop blur fragments. */
	blur,
} as const
