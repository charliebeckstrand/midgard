/**
 * Popover archetype — panel slot bundle. Composes the floating panel's
 * base layout, surface, glass treatment, ring, and motion. Property names
 * mirror the kata slot layout so consumers can destructure and pass
 * through unchanged.
 *
 * Layer: kiso · Archetype: popover · Concern: panel
 */

import { omote } from '../omote'
import { sen } from '../sen'
import { ugoki } from '../ugoki'

export const panel = {
	base: [
		'absolute z-50 isolate',
		'min-w-full',
		'p-1 space-y-0.5',
		'overflow-y-auto overscroll-contain',
		'rounded-lg',
		'outline outline-transparent focus:outline-hidden',
		'cursor-pointer select-none',
	],
	surface: omote.popover,
	glass: omote.glass,
	ring: sen.ring,
	motion: ugoki.popover,
}
