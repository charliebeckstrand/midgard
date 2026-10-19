/**
 * Slider archetype: shared substrate for the native and ranged sliders.
 * Three fragments: the color CSS-variable bundle, the size scale, and the
 * rings of the native thumb.
 */

import { color } from './color'
import { scale } from './scale'
import { thumb } from './thumb'

export const slider = {
	color,
	scale,
	thumb,
} as const
