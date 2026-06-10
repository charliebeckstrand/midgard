/**
 * Popover archetype: panel slot bundle. Composes the floating panel's
 * base layout, surface, glass treatment, ring, and motion. Property names
 * mirror the kata slot layout for direct destructuring pass-through.
 *
 * Layer: kiso · Archetype: popover · Concern: panel
 */

import { hannou } from '../hannou'
import { kasane } from '../kasane'
import { omote } from '../omote'
import { sen } from '../sen'
import { ugoki } from '../ugoki'

const { cursor } = hannou
const { rounded } = kasane
const { popover, glass } = omote
const { ring } = sen

export const panel = {
	base: [
		'z-50',
		'absolute isolate',
		'min-w-full',
		'p-1 space-y-0.5',
		'overflow-y-auto overscroll-contain',
		rounded.lg,
		'outline outline-transparent focus:outline-hidden',
		...cursor,
		'select-none',
	],
	surface: popover,
	glass,
	ring: ring.default,
	motion: ugoki.popover,
} as const
