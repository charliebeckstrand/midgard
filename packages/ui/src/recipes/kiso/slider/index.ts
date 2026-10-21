/**
 * Slider archetype: shared substrate for the native and ranged sliders.
 * The fragments are the fill variable of each color, the shared track
 * variable, the size scale, and the rings of the native thumb.
 */

import { color, track } from './color'
import { scale } from './scale'
import { thumb } from './thumb'

export const slider = {
	color,
	track,
	scale,
	thumb,
} as const
