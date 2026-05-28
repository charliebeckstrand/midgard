/**
 * Popover archetype — panel slot bundle. Composes the floating panel's
 * base layout, surface, glass treatment, ring, and motion. Property names
 * mirror the kata slot layout so consumers can destructure and pass
 * through unchanged.
 *
 * Layer: kiso · Archetype: popover · Concern: panel
 */

import { hannou } from '../hannou'
import { kasane } from '../kasane'
import { omote } from '../omote'
import { sen } from '../sen'
import { ugoki } from '../ugoki'

export const panel = {
	base: [
		'z-50',
		'absolute isolate',
		'min-w-full',
		'p-1 space-y-0.5',
		'overflow-y-auto overscroll-contain',
		kasane.radius.rounded.lg,
		'outline outline-transparent focus:outline-hidden',
		...hannou.cursor,
		'select-none',
	],
	surface: omote.popover,
	glass: omote.glass,
	ring: sen.ring.default,
	motion: ugoki.popover,
} as const
