/**
 * Sen (線) — Lines.
 *
 * Borders, rings, dividers, focus indicators, and forced-colors safety nets —
 * how an element draws its edges. Each entry bundles line structure
 * (width / orientation) with its default colour; colour-only variants live
 * alongside for overrides.
 *
 * Tier: 1 · Concern: lines
 */

// ── Motoi (基) — structure only ─────────────────────────
const motoi = {
	border: 'border',
	outline: 'outline',
	ring: 'ring-1',
	divider: 'border-t',
}

// ── Hiru (昼) — light palette ───────────────────────────
const hiru = {
	border: 'border-zinc-950/10',
	borderStrong: 'border-zinc-950/15',
	borderEmphasis: 'border-zinc-950/20',
	borderSubtle: 'border-zinc-950/5',
	borderTransparent: 'border-transparent',
	outline: 'outline-1 outline-zinc-950/10',
	outlineStrong: 'outline-1 outline-zinc-950/15',
	outlineEmphasis: 'outline-1 outline-zinc-950/20',
	outlineSubtle: 'outline-1 outline-zinc-950/5',
	ring: 'ring-zinc-950/10',
	ringStrong: 'ring-zinc-950/20',
	ringSubtle: 'ring-zinc-950/5',
}

// ── Yoru (夜) — dark palette ────────────────────────────
const yoru = {
	border: 'dark:border-white/10',
	borderStrong: 'dark:border-white/15',
	borderEmphasis: 'dark:border-white/20',
	borderSubtle: 'dark:border-white/5',
	borderTransparent: 'dark:border-transparent',
	outline: 'dark:outline-1 dark:outline-white/10',
	outlineStrong: 'dark:outline-1 dark:outline-white/15',
	outlineEmphasis: 'dark:outline-1 dark:outline-white/20',
	outlineSubtle: 'dark:outline-1 dark:outline-white/5',
	ring: 'dark:ring-white/10',
	ringStrong: 'dark:ring-white/15',
	ringSubtle: 'dark:ring-white/5',
}

// ── Export ──────────────────────────────────────────────
export const sen = {
	/** Default border — 1 px, low-contrast palette. */
	border: [motoi.border, hiru.border, yoru.border],
	/** Border colour only (for composites that already apply width). */
	borderColor: [hiru.border, yoru.border],
	/** Stronger border — for emphasis on dark backgrounds. */
	borderStrong: [motoi.border, hiru.border, yoru.borderStrong],
	/** Emphasis border — hover / active states. */
	borderEmphasis: [motoi.border, hiru.borderEmphasis, yoru.borderEmphasis],
	/** Subtle border — secondary separators. */
	borderSubtle: [motoi.border, hiru.borderSubtle, yoru.borderSubtle],
	/** Subtle border colour only. */
	borderSubtleColor: [hiru.borderSubtle, yoru.borderSubtle],
	/** Transparent border — reserves layout space without a visible edge. */
	borderTransparent: [hiru.borderTransparent, yoru.borderTransparent],

	/** Default outline — 1 px outline-style line. */
	outline: [motoi.outline, hiru.outline, yoru.outline],
	/** Stronger outline — for emphasis on dark backgrounds. */
	outlineStrong: [motoi.outline, hiru.outlineStrong, yoru.outlineStrong],
	/** Emphasis outline — hover / active states. */
	outlineEmphasis: [motoi.outline, hiru.outlineEmphasis, yoru.outlineEmphasis],
	/** Subtle outline — secondary separators. */
	outlineSubtle: [motoi.outline, hiru.outlineSubtle, yoru.outlineSubtle],

	/** Default ring — 1 px outline-style line. */
	ring: [motoi.ring, hiru.ring, yoru.ring],
	/** Inset ring — sits inside the element, subtle in light / stronger in dark. */
	ringInset: [motoi.ring, hiru.ring, yoru.ring, 'ring-inset'],
	/** Subtle ring — secondary outlines. */
	ringSubtle: [motoi.ring, hiru.ringSubtle, yoru.ringSubtle],

	/** Top divider — `border-t` with subtle colour. */
	divider: [motoi.divider, hiru.borderSubtle, yoru.borderSubtle],

	/** Focus indicators — how an element signals keyboard focus. */
	focus: {
		ring: 'outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
		inset: 'outline-none focus-visible:ring-2 ring-inset focus-visible:ring-blue-600',
		offset:
			'outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600',
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
