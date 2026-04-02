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
	text: 'text-zinc-950 dark:text-white',

	/** Muted ink — descriptions, placeholders, secondary labels */
	mutedText: 'text-zinc-500 dark:text-zinc-400',

	/** Error ink — validation messages, destructive state text */
	errorText: 'text-red-600 dark:text-red-500',

	/** Muted fill — icon fills at secondary weight */
	mutedFill: 'fill-zinc-500 dark:fill-zinc-400',

	/** Muted fill scoped to icon slots */
	iconFill: '*:data-[slot=icon]:fill-zinc-500 dark:*:data-[slot=icon]:fill-zinc-400',
}
