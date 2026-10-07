/**
 * Sen border: 1 px borders in the four library tones. Each entry bundles
 * the `border` width utility with its tone-pair from `sen/tone`. The
 * `color` group exposes the color-only pair for consumers that already apply
 * the border-width class themselves.
 *
 * Layer: kiso · Concern: borders
 */

import { tone } from './tone'

export const border = {
	/** Default border: 1 px, low-contrast palette. */
	default: ['border', ...tone.border],
	/** The color of each border only, for composites that already apply the width. */
	color: {
		/** The default color. */
		default: tone.border,
		/** The emphasis color. */
		emphasis: tone.borderEmphasis,
		/** The subtle color. */
		subtle: tone.borderSubtle,
		/** Transparent: reserves layout space without a visible edge. */
		transparent: tone.borderTransparent,
	},
} as const
