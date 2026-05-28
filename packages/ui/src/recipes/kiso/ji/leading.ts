/**
 * Ji leading — line-height aliases. `none` is for headings that should
 * sit at their exact em-height; `tight` is for descriptions; `normal`
 * is body copy; `relaxed` is long-form prose.
 *
 * Layer: kiso · Concern: line height
 */

export const leading = {
	none: 'leading-none',
	tight: 'leading-tight',
	normal: 'leading-normal',
	relaxed: 'leading-relaxed',
} as const
