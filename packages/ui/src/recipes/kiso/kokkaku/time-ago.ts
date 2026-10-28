/**
 * Kokkaku skeleton: time-ago. One line of the inherited text, in place of the
 * relative text before the clock of the reader is known. TimeAgo takes the size
 * of its parent, so the line height is `1lh` of that text.
 *
 * The length of the text changes with the value, the locale, and the format.
 * The width holds a short default text, such as "3 days ago", and does not go
 * wider than the parent.
 *
 * Layer: kiso · Concern: skeleton form · Unit: time-ago
 */

export const timeAgo = {
	line: 'h-lh w-[10ch] max-w-full',
} as const
