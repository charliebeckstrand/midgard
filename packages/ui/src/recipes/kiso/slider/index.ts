/**
 * Slider archetype: shared substrate for the native and ranged sliders.
 * Two fragments: the color CSS-variable bundle, and the size scale.
 */

import { color } from './color'
import { scale } from './scale'

export const slider = {
	color,
	scale,
} as const
