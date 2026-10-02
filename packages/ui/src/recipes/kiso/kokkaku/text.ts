/**
 * Kokkaku skeleton: text. A single line, capped at `sm:max-w-sm`;
 * multi-line content wraps below rather than alongside.
 *
 * `base` is the 6-unit line of `md` text, the size that text inherits by
 * default. `line` holds the line height of each step of the text `size` axis,
 * so a sized skeleton matches the text it stands in for.
 *
 * Layer: kiso · Concern: skeleton form · Unit: text
 */

export const text = {
	base: 'h-6 sm:max-w-sm',
	line: {
		xs: 'h-4',
		sm: 'h-5',
		md: 'h-6',
		lg: 'h-7',
	},
} as const
