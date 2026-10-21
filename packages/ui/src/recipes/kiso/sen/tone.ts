/**
 * Sen tone: the line color of each kind of line when the user asks for more
 * contrast (`prefers-contrast: more`). Border, outline, ring, and divider each
 * add the step of their kind to each visible color.
 *
 * Each step draws at 50% alpha. That is the lowest step of the scale that
 * gives a line a 3:1 contrast on the page background, in each mode.
 *
 * Layer: kiso · Concern: line tone
 */

/** The line color of each mode when the user asks for more contrast. */
export const contrastMore = {
	border: { light: 'contrast-more:border-zinc-950/50', dark: 'dark:contrast-more:border-white/50' },
	outline: {
		light: 'contrast-more:outline-zinc-950/50',
		dark: 'dark:contrast-more:outline-white/50',
	},
	ring: { light: 'contrast-more:ring-zinc-950/50', dark: 'dark:contrast-more:ring-white/50' },
	divide: { light: 'contrast-more:divide-zinc-950/50', dark: 'dark:contrast-more:divide-white/50' },
} as const
