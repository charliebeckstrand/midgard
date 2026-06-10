/**
 * Iro outline: bordered palette. No fill; the colour shows as a border
 * (and ring, for kata that paint with rings). Text and hover share the
 * colour-axis sources.
 *
 * Layer: kiso · Concern: outline palette
 */

import { shades } from '../../../core/recipe'

import { hover } from './hover'
import { text } from './text'

export const outline = {
	border: shades({
		zinc: ['border-zinc-800', 'dark:border-zinc-600'],
		red: ['border-red-600', 'dark:border-red-700'],
		amber: ['border-amber-500', 'dark:border-amber-600'],
		green: ['border-green-600', 'dark:border-green-700'],
		blue: ['border-blue-600', 'dark:border-blue-700'],
	}),
	ring: shades({
		zinc: ['ring-zinc-800', 'dark:ring-zinc-600'],
		red: ['ring-red-600', 'dark:ring-red-700'],
		amber: ['ring-amber-500', 'dark:ring-amber-600'],
		green: ['ring-green-600', 'dark:ring-green-700'],
		blue: ['ring-blue-600', 'dark:ring-blue-700'],
	}),
	text,
	hover,
}
