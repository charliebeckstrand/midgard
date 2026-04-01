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

	/** Muted ink — descriptions, placeholders, secondary labels */
	muted: 'text-zinc-500 dark:text-zinc-400',

	/** Error ink — validation messages, destructive state text */
	error: 'text-red-600 dark:text-red-500',
}
