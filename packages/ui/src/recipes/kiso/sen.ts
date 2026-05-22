/**
 * Sen (線) — lines.
 *
 * Borders, rings, dividers, focus indicators, and forced-colors safety nets —
 * how an element draws its edges. Each entry bundles line structure
 * (width / orientation) with its default colour; colour-only variants live
 * alongside for overrides.
 *
 * Layer: kiso · Concern: lines
 */

import { defineColors } from '../../core/recipe'

// Light/dark colour pairs. Public exports below compose these with structural
// width via array spread; colour-only siblings re-export the pair directly.
const tone = defineColors({
	border: { light: 'border-zinc-950/10', dark: 'dark:border-white/10' },
	borderEmphasis: { light: 'border-zinc-950/20', dark: 'dark:border-white/20' },
	borderSubtle: { light: 'border-zinc-950/5', dark: 'dark:border-white/5' },
	borderTransparent: { light: 'border-transparent', dark: 'dark:border-transparent' },
	outline: {
		light: 'outline-1 outline-zinc-950/10',
		dark: 'dark:outline-1 dark:outline-white/10',
	},
	outlineStrong: {
		light: 'outline-1 outline-zinc-950/15',
		dark: 'dark:outline-1 dark:outline-white/15',
	},
	outlineSubtle: {
		light: 'outline-1 outline-zinc-950/5',
		dark: 'dark:outline-1 dark:outline-white/5',
	},
	ring: { light: 'ring-zinc-950/10', dark: 'dark:ring-white/10' },
})

export const sen = {
	/** Default border — 1 px, low-contrast palette. */
	border: ['border', ...tone.border],
	/** Border colour only (for composites that already apply width). */
	borderColor: tone.border,
	/** Emphasis border — hover / active states. */
	borderEmphasis: ['border', ...tone.borderEmphasis],
	/** Subtle border — secondary separators. */
	borderSubtle: ['border', ...tone.borderSubtle],
	/** Subtle border colour only. */
	borderSubtleColor: tone.borderSubtle,
	/** Transparent border — reserves layout space without a visible edge. */
	borderTransparent: tone.borderTransparent,

	/** Default outline — 1 px outline-style line. */
	outline: ['outline', ...tone.outline],
	/** Stronger outline — for emphasis on dark backgrounds. */
	outlineStrong: ['outline', ...tone.outlineStrong],
	/** Subtle outline — secondary separators. */
	outlineSubtle: ['outline', ...tone.outlineSubtle],

	/** Default ring — 1 px outline-style line. */
	ring: ['ring-1', ...tone.ring],
	/** Inset ring — sits inside the element, subtle in light / stronger in dark. */
	ringInset: ['ring-1', ...tone.ring, 'ring-inset'],

	/** Top divider — `border-t` with subtle colour. */
	divider: ['border-t', ...tone.borderSubtle],

	/** Focus indicators — how an element signals keyboard focus. */
	focus: {
		ring: 'outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
		inset: 'outline-none focus-visible:ring-2 ring-inset focus-visible:ring-blue-600',
		outline:
			'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-blue-600',
		indicator: 'not-data-current:focus-visible:after:bg-blue-600',
		lifted: 'z-10 shadow-md focus-visible:ring-violet-600',
	},

	/**
	 * Forced-colors (Windows High Contrast Mode) safety nets — restore visible
	 * edges and semantic colour when the browser strips author colours.
	 */
	forced: {
		/** Panel outline — restores a visible edge when backgrounds are stripped. */
		outline: 'forced-colors:outline',
		/** Item text — preserves semantic foreground colour. */
		text: 'forced-color-adjust-none forced-colors:text-[CanvasText]',
		/** Focus state — maps to system highlight colours. */
		focus: 'forced-colors:focus:bg-[Highlight] forced-colors:focus:text-[HighlightText]',
		/** Form control — restores native appearance and checked-state visibility. */
		control:
			'forced-colors:opacity-100 forced-colors:appearance-auto forced-colors:checked:appearance-auto',
		/** Icon slot — keeps data-slot=icon children on CanvasText. */
		icon: 'forced-colors:*:data-[slot=icon]:text-[CanvasText]',
	},
} as const
