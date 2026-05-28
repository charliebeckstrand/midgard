/**
 * Sen border — 1px borders in the four library tones. Each entry bundles
 * the `border` width utility with its tone-pair from `sen/tone`. The
 * `*Color` siblings expose the colour-only pair for consumers that
 * already apply the border-width class themselves.
 *
 * Layer: kiso · Concern: borders
 */

import { tone } from './tone'

/** Default border — 1 px, low-contrast palette. */
export const border = ['border', ...tone.border]
/** Border colour only (for composites that already apply width). */
export const borderColor = tone.border
/** Emphasis border — hover / active states. */
export const borderEmphasis = ['border', ...tone.borderEmphasis]
/** Subtle border — secondary separators. */
export const borderSubtle = ['border', ...tone.borderSubtle]
/** Subtle border colour only. */
export const borderSubtleColor = tone.borderSubtle
/** Transparent border — reserves layout space without a visible edge. */
export const borderTransparent = tone.borderTransparent
