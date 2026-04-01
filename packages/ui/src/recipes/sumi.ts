/**
 * Sumi (墨) — The marks.
 *
 * The ink, the pigment — what the eye reads. Each value encodes a light/dark
 * color pair. Changing the design system's text palette means editing these values.
 *
 * Branch of: Sumi (root)
 * Concern: color
 */
export const sumi = {
	/** Full-strength ink — headings, labels, body text */
	base: 'text-zinc-950 dark:text-white',

	/** Diluted ink (薄い) — descriptions, placeholders, secondary labels */
	usui: 'text-zinc-500 dark:text-zinc-400',

	/** Error ink — validation messages, destructive state text */
	ayamari: 'text-red-600 dark:text-red-500',
}
