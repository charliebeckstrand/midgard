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
		'rounded-lg',
		'absolute isolate z-50 min-w-full',
		'p-1 space-y-0.5',
		'outline outline-transparent focus:outline-hidden',
		'overflow-y-auto overscroll-contain',
		'cursor-pointer select-none',
	],
	surface: omote.popover,
	glass: omote.glass,
	ring: sen.ring,
	motion: ugoki.popover,
}
