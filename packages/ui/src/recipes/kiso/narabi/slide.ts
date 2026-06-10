/**
 * Narabi slide: edge-anchored positioning for sliding panels (sheet,
 * drawer). Each direction pins to the corresponding viewport edge and
 * fills the perpendicular axis.
 *
 * Layer: kiso · Concern: edge-anchored positioning
 */

export const slide = {
	right: 'inset-y-0 right-0 h-full w-full',
	left: 'inset-y-0 left-0 h-full w-full',
	top: 'inset-x-0 top-0 w-full',
	bottom: 'inset-x-0 bottom-0 w-full',
} as const
