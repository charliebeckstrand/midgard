/**
 * Kokkaku skeleton: date-time. One line of the inherited text, in place of a
 * date before the zone of the reader is known. DateTime takes the size of its
 * parent, so the line height is `1lh` of that text.
 *
 * The length of the text changes with the value, the locale, and the format.
 * The width holds a short default text, such as "Sun 1:00 PM", and does not go
 * wider than the parent.
 *
 * Layer: kiso · Concern: skeleton form · Unit: date-time
 */

export const dateTime = {
	line: 'h-lh w-[12ch] max-w-full',
} as const
