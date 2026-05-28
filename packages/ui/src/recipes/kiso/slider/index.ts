/**
 * Slider archetype — shared substrate for the native and ranged sliders.
 * One fragment today (the colour CSS-variable bundle); a sub-folder
 * rather than a flat file so future additions land in the established
 * pattern.
 */

import { color } from './color'

export const slider = {
	color,
} as const
