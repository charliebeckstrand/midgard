/**
 * Kage (影) — Edges and borders.
 *
 * The shadow that defines form — dividers, outlines, separators.
 * Each value encodes a light/dark border-color pair.
 *
 * Branch of: Sumi (root)
 * Concern: color
 */
export const kage = {
	/** The standard edge — subtle separator between surfaces */
	base: 'border-zinc-950/10 dark:border-white/10',

	/** A softer edge — dividers within content, quieter boundaries */
	subtle: 'border-zinc-950/5 dark:border-white/5',

	/** Ring edge — the standard ring boundary for elevated surfaces */
	ring: 'ring-1 ring-zinc-950/10 dark:ring-white/10',

	/** Soft ring edge — quieter ring for content cards */
	ringSubtle: 'ring-1 ring-zinc-950/5 dark:ring-white/10',
}
