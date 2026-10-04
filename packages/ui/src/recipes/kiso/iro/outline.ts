/**
 * Iro outline: ringed palette. No fill; the color shows as a ring. Text and
 * hover share the color-axis sources.
 *
 * Layer: kiso · Concern: outline palette
 */

import { shades } from '../../../core/recipe'

import { hover } from './hover'
import { onTint } from './ramp'

export const outline = {
	ring: shades({
		zinc: ['ring-zinc-800', 'dark:ring-zinc-600'],
		red: ['ring-red-600', 'dark:ring-red-700'],
		amber: ['ring-amber-500', 'dark:ring-amber-600'],
		green: ['ring-green-600', 'dark:ring-green-700'],
		blue: ['ring-blue-600', 'dark:ring-blue-700'],
	}),
	text: onTint,
	hover,
} as const
