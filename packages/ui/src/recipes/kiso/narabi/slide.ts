/**
 * Narabi slide: edge-anchored positioning for a sheet docked to the top or
 * the bottom. Each direction pins to the edge of its overlay root and fills the
 * width.
 *
 * Layer: kiso · Concern: edge-anchored positioning
 */

export const slide = {
	top: 'inset-x-0 top-0 w-full',
	bottom: 'inset-x-0 bottom-0 w-full',
} as const
