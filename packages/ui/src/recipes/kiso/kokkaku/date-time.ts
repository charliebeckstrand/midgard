/**
 * Kokkaku skeleton: date-time. It stands in for a date before the zone of the
 * reader is known. It holds the same date in UTC as text that does not show, so
 * it has the size of the text that replaces it.
 *
 * The skeleton is inline, so it breaks across lines as the text does. Each
 * line of it paints its own fill (`box-decoration-clone`). The text has a
 * baseline, so the line box keeps the height of the text.
 *
 * Forced colors replace a transparent text color with a system color, so the
 * skeleton keeps its own colors. Otherwise the reader sees the UTC text as the
 * time.
 *
 * Layer: kiso · Concern: skeleton form · Unit: date-time
 */

export const dateTime = {
	text: 'inline box-decoration-clone text-transparent select-none forced-color-adjust-none',
} as const
