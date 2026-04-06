/**
 * Kage (影) — Shadow and edges.
 *
 * Borders, dividers, rings, shadows — everything that creates depth.
 *
 * Tier: 1
 * Concern: edge
 */

// ── Motoi (基) ──────────────────────────────────────────
const motoi = {
	border: 'border',
	ring: 'ring-1',
	separator: 'border-t',
	shadow: 'shadow-sm',
}

// ── Hiru (昼) ───────────────────────────────────────────
const hiru = {
	border: 'border-zinc-950/10',
	borderEmphasis: 'border-zinc-950/20',
	borderSubtle: 'border-zinc-950/5',
	ring: 'ring-zinc-950/10',
	ringSubtle: 'ring-zinc-950/5',
}

// ── Yoru (夜) ───────────────────────────────────────────
const yoru = {
	border: 'dark:border-white/10',
	borderStrong: 'dark:border-white/15',
	borderEmphasis: 'dark:border-white/20',
	borderSubtle: 'dark:border-white/5',
	ring: 'dark:ring-white/10',
	ringSubtle: 'dark:ring-white/10',
}

// ── Export ───────────────────────────────────────────────
export const kage = {
	border: [motoi.border, hiru.border, yoru.border],
	borderStrong: [motoi.border, hiru.border, yoru.borderStrong],
	borderEmphasis: [motoi.border, hiru.borderEmphasis, yoru.borderEmphasis],
	borderSubtle: [motoi.border, hiru.borderSubtle, yoru.borderSubtle],
	borderSubtleColor: [hiru.borderSubtle, yoru.borderSubtle],
	ring: [motoi.ring, hiru.ring, yoru.ring],
	ringSubtle: [motoi.ring, hiru.ringSubtle, yoru.ringSubtle],
	separator: [motoi.separator, hiru.borderSubtle, yoru.borderSubtle],
	shadow: motoi.shadow,
} as const
