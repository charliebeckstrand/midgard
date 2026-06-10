/**
 * Iro soft: translucent fill palette. Background is the colour at 15%
 * opacity; text inherits the colour-axis text shade. Hover doubles the
 * opacity to 30%.
 *
 * Layer: kiso · Concern: soft palette
 */

import { shades } from '../../../core/recipe'

import { text } from './text'

export const soft = {
	bg: shades({
		zinc: 'bg-zinc-600/15',
		red: 'bg-red-600/15',
		amber: 'bg-amber-500/15',
		green: 'bg-green-600/15',
		blue: 'bg-blue-600/15',
	}),
	text,
	hover: shades({
		zinc: ['not-disabled:hover:bg-zinc-600/30', 'dark:not-disabled:hover:bg-zinc-500/30'],
		red: ['not-disabled:hover:bg-red-600/30', 'dark:not-disabled:hover:bg-red-500/30'],
		amber: ['not-disabled:hover:bg-amber-500/30', 'dark:not-disabled:hover:bg-amber-500/30'],
		green: ['not-disabled:hover:bg-green-600/30', 'dark:not-disabled:hover:bg-green-500/30'],
		blue: ['not-disabled:hover:bg-blue-600/30', 'dark:not-disabled:hover:bg-blue-500/30'],
	}),
}
