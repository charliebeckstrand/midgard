/**
 * Omote (面) — Surfaces.
 *
 * Named surface chromes — the visual plane content sits on. Each entry is a
 * composition of atomic primitives (`iro` colour, `sen` lines + forced-colors).
 * Surfaces exist as a composite layer because popovers, panels, and backdrops
 * each have a coherent multi-property chrome that is always applied together.
 *
 * Tier: 3 · Concern: surface
 */

import { iro } from './iro'
import { sen } from './sen'

// Backdrop-blur fragments.
const blur = {
	sm: 'backdrop-blur-sm',
	md: 'backdrop-blur',
	lg: 'backdrop-blur-lg',
}

export const omote = {
	/** Solid surface background (cards, sidebars, navbars). */
	surface: iro.bg.surface,
	/** Solid panel background (dialogs, sheets, drawers). */
	panel: {
		/** Background fill only. */
		bg: iro.bg.panel,
		/** Chrome only — ring + shadow + forced-colour outline, no fill. */
		chrome: [sen.ring, sen.forced.outline],
		/** Fill + chrome, everything a floating panel needs. */
		base: [sen.ring, sen.forced.outline, iro.bg.panel],
	},
	/** Floating popover surface — translucent fill + ring + blur. */
	popover: [blur.md, iro.bg.popover, sen.ring],
	/** Fully transparent glass surface — blur only. */
	glass: ['bg-transparent', blur.md],
	/** Backdrop fills (modal / sheet overlays). */
	backdrop: {
		base: [iro.bg.backdrop.md, blur.sm],
		glass: iro.bg.backdrop.lg,
	},
	/** Card content block with viewport-dependent chrome. */
	content: ['lg:rounded-lg', 'lg:shadow-xs', 'lg:bg-white', 'dark:lg:bg-zinc-900'],
	/** Subtle tinted overlay — used for raised / striped rows. */
	tint: iro.bg.tint,
	/** Loading skeleton background. */
	skeleton: [iro.bg.skeleton, 'animate-pulse'],
	/** Backdrop blur fragments. */
	blur,
} as const
