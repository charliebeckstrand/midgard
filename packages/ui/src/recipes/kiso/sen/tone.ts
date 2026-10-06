/**
 * Sen tone: the color pairs (`light`/`dark`) every line concern
 * composes with its structural width. Lives separately; border /
 * outline / ring share one source of truth for low-contrast,
 * emphasis, subtle, and transparent tones.
 *
 * When the user asks for more contrast (`prefers-contrast: more`), each
 * visible tone draws at 50% alpha. That is the lowest step of the scale that
 * gives a line a 3:1 contrast on the page background, in each mode.
 *
 * Layer: kiso · Concern: line tone
 */

import { defineColors } from '../../../core/recipe'

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

const { border, outline, ring } = contrastMore

export const tone = defineColors({
	border: {
		light: ['border-zinc-950/10', border.light],
		dark: ['dark:border-white/10', border.dark],
	},
	borderEmphasis: {
		light: ['border-zinc-950/20', border.light],
		dark: ['dark:border-white/20', border.dark],
	},
	borderSubtle: {
		light: ['border-zinc-950/5', border.light],
		dark: ['dark:border-white/5', border.dark],
	},
	borderTransparent: { light: 'border-transparent', dark: 'dark:border-transparent' },
	outline: {
		light: ['outline-1 outline-zinc-950/10', outline.light],
		dark: ['dark:outline-1 dark:outline-white/10', outline.dark],
	},
	outlineStrong: {
		light: ['outline-1 outline-zinc-950/15', outline.light],
		dark: ['dark:outline-1 dark:outline-white/15', outline.dark],
	},
	outlineSubtle: {
		light: ['outline-1 outline-zinc-950/5', outline.light],
		dark: ['dark:outline-1 dark:outline-white/5', outline.dark],
	},
	ring: { light: ['ring-zinc-950/10', ring.light], dark: ['dark:ring-white/10', ring.dark] },
})
