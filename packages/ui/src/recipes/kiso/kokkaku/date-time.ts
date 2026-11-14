/**
 * Kokkaku skeleton: date-time. It stands in for a date until the browser
 * formats it, after hydration. It holds the date in UTC as text that does not
 * show, so it has about the size of the text that replaces it.
 *
 * The skeleton is inline, so it breaks across lines as the text does. Each
 * line of it paints its own fill (`box-decoration-clone`). The text has a
 * baseline, so the line box keeps the height of the text.
 *
 * Forced colors replace a transparent text color with a system color, so the
 * skeleton keeps its own colors. Otherwise the reader sees the UTC text as the
 * time.
 *
 * In a flex or a grid parent, such as a button, the skeleton is a block. Then
 * it takes the height of its line of text (`h-auto`), as the text does, and
 * not the default height of a placeholder.
 *
 * Layer: kiso · Concern: skeleton form · Unit: date-time
 */

export const dateTime = {
	text: 'inline h-auto box-decoration-clone text-transparent select-none forced-color-adjust-none',
} as const
