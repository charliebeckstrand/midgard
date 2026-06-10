/**
 * Sen border: 1 px borders in the four library tones. Each entry bundles
 * the `border` width utility with its tone-pair from `sen/tone`. The
 * `color` siblings expose the colour-only pair for consumers that
 * already apply the border-width class themselves.
 *
 * Layer: kiso · Concern: borders
 */

import { tone } from './tone'

export const border = {
	/** Default border: 1 px, low-contrast palette. */
	default: ['border', ...tone.border],
	/** Default border colour only (for composites that already apply width). */
	defaultColor: tone.border,
	/** Emphasis border: hover / active states. */
	emphasis: ['border', ...tone.borderEmphasis],
	/** Emphasis border colour only. */
	emphasisColor: tone.borderEmphasis,
	/** Subtle border: secondary separators. */
	subtle: ['border', ...tone.borderSubtle],
	/** Subtle border colour only. */
	subtleColor: tone.borderSubtle,
	/** Transparent border: reserves layout space without a visible edge. */
	transparent: tone.borderTransparent,
} as const
