/**
 * Slider archetype — shared substrate for the native and ranged sliders.
 * Currently one fragment (the colour CSS-variable bundle); structured as
 * a sub-folder for extensibility.
 */

import { color } from './color'

export const slider = {
	color,
} as const
