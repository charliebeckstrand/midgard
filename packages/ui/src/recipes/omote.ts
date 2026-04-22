/**
 * Omote (面) — Surfaces.
 *
 * Named surface chromes — the visual plane content sits on. Each entry is a
 * composition of atomic primitives (`iro` colour, `sen` lines, `garasu` blur,
 * `kage` shadow, `kyousei` forced-colours). Surfaces exist as a composite
 * layer because popovers, panels, and backdrops each have a coherent
 * multi-property chrome that is always applied together.
 *
 * Tier: 2 · Concern: surface
 */

import { garasu } from './garasu'
import { iro } from './iro'
import { kyousei } from './kyousei'
import { sen } from './sen'

export const omote = {
	/** Solid surface background (cards, sidebars, navbars). */
	surface: iro.bg.surface,
	/** Solid panel background (dialogs, sheets, drawers). */
	panel: {
		/** Background fill only. */
		bg: iro.bg.panel,
		/** Chrome only — ring + shadow + forced-colour outline, no fill. */
		chrome: [sen.ring, kyousei.outline],
		/** Fill + chrome, everything a floating panel needs. */
		base: [sen.ring, kyousei.outline, iro.bg.panel],
	},
	/** Floating popover surface — translucent fill + ring + blur. */
	popover: [garasu.md, iro.bg.popover, sen.ring, 'dark:ring-inset'],
	/** Fully transparent glass surface — blur only. */
	glass: ['bg-transparent', garasu.md],
	/** Backdrop fills (modal / sheet overlays). */
	backdrop: {
		base: [iro.bg.backdrop.md, garasu.sm],
		glass: iro.bg.backdrop.lg,
	},
	/** Card content block with viewport-dependent chrome. */
	content: ['lg:rounded-lg', 'lg:shadow-xs', 'lg:bg-white', 'dark:lg:bg-zinc-900'],
	/** Subtle tinted overlay — used for raised / striped rows. */
	tint: iro.bg.tint,
	/** Tint applied via `::before` — for overlays that shouldn't stack children. */
	tintBefore: iro.bg.tintBefore,
	/** Loading skeleton background — pulse + muted fill. */
	skeleton: ['animate-pulse', iro.bg.skeleton],
} as const
