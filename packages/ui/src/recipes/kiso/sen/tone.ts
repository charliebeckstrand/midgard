/**
 * Sen tone: the colour pairs (`light`/`dark`) every line concern
 * composes with its structural width. Lives separately; border /
 * outline / ring share one source of truth for low-contrast,
 * emphasis, subtle, and transparent tones.
 *
 * Layer: kiso · Concern: line tone
 */

import { defineColors } from '../../../core/recipe'

export const tone = defineColors({
	border: { light: 'border-zinc-950/10', dark: 'dark:border-white/10' },
	borderEmphasis: { light: 'border-zinc-950/20', dark: 'dark:border-white/20' },
	borderSubtle: { light: 'border-zinc-950/5', dark: 'dark:border-white/5' },
	borderTransparent: { light: 'border-transparent', dark: 'dark:border-transparent' },
	outline: {
		light: 'outline-1 outline-zinc-950/10',
		dark: 'dark:outline-1 dark:outline-white/10',
	},
	outlineStrong: {
		light: 'outline-1 outline-zinc-950/15',
		dark: 'dark:outline-1 dark:outline-white/15',
	},
	outlineSubtle: {
		light: 'outline-1 outline-zinc-950/5',
		dark: 'dark:outline-1 dark:outline-white/5',
	},
	ring: { light: 'ring-zinc-950/10', dark: 'dark:ring-white/10' },
})
