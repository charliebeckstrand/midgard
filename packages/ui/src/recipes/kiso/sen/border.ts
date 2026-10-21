/**
 * Sen border: 1 px borders in the four library tones. `default` bundles the
 * `border` width utility with the default color. The `color` group holds the
 * color only, for a composite that already applies the border width.
 *
 * Layer: kiso · Concern: borders
 */

import { mode } from '../../../core/recipe'

import { contrastMore } from './tone'

const { light, dark } = contrastMore.border

/** The color of each border only, for composites that already apply the width. */
const color = {
	/** The default color: low contrast. */
	default: mode(['border-zinc-950/10', light], ['dark:border-white/10', dark]),
	/** The emphasis color. */
	emphasis: mode(['border-zinc-950/20', light], ['dark:border-white/20', dark]),
	/** The subtle color. */
	subtle: mode(['border-zinc-950/5', light], ['dark:border-white/5', dark]),
	/** Transparent: reserves layout space without a visible edge. */
	transparent: mode('border-transparent', 'dark:border-transparent'),
} as const

export const border = {
	/** Default border: 1 px, low-contrast palette. */
	default: ['border', ...color.default],
	color,
} as const
