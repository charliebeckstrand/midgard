/**
 * Sen (線) — Lines.
 *
 * Borders, rings, and dividers — how an element draws its edges.
 * Each entry bundles line structure (width / orientation) with its default
 * colour; colour-only variants live alongside for overrides.
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
	ringHover: 'hover:ring-zinc-950/20',
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
	ringHover: 'dark:hover:ring-white/20',
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
	/** Hover ring — hover state outlines. */
	ringHover: [motoi.ring, hiru.ringHover, yoru.ringHover],
	/** Top divider — `border-t` with subtle colour. */
	divider: [motoi.divider, hiru.borderSubtle, yoru.borderSubtle],
} as const
