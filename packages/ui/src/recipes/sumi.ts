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
	textMuted: 'text-zinc-500 dark:text-zinc-400',

	/** Error ink — validation messages, destructive state text */
	textError: 'text-red-600 dark:text-red-500',

	/** Muted text scoped to icon slots */
	textIcon: '*:data-[slot=icon]:text-zinc-500 dark:*:data-[slot=icon]:text-zinc-400',

	/** Muted fill — icon fills at secondary weight */
	fillMuted: 'fill-zinc-500 dark:fill-zinc-400',

	/** Muted fill scoped to icon slots */
	fillIcon: '*:data-[slot=icon]:fill-zinc-500 dark:*:data-[slot=icon]:fill-zinc-400',
}
