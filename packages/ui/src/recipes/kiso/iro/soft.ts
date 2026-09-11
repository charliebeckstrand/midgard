/**
 * Iro soft: translucent fill palette. Background is the colour at 15%
 * opacity; text inherits the colour-axis text shade. Hover doubles the
 * opacity to 30%. `strong` is that same doubled rung, for fills a component
 * drives from its own state — a selected row, a chosen region — rather than
 * from a pointer being over it.
 *
 * Layer: kiso · Concern: soft palette
 */

import { shades } from '../../../core/recipe'

import { text } from './text'

export const soft = {
	bg: shades({
		zinc: 'bg-zinc-500/15',
		red: 'bg-red-500/15',
		amber: 'bg-amber-500/15',
		green: 'bg-green-500/15',
		blue: 'bg-blue-500/15',
	}),
	text,
	strong: shades({
		zinc: 'bg-zinc-500/30',
		red: 'bg-red-500/30',
		amber: 'bg-amber-500/30',
		green: 'bg-green-500/30',
		blue: 'bg-blue-500/30',
	}),
	hover: shades({
		zinc: 'not-disabled:not-data-disabled:hover:bg-zinc-500/30',
		red: 'not-disabled:not-data-disabled:hover:bg-red-500/30',
		amber: 'not-disabled:not-data-disabled:hover:bg-amber-500/30',
		green: 'not-disabled:not-data-disabled:hover:bg-green-500/30',
		blue: 'not-disabled:not-data-disabled:hover:bg-blue-500/30',
	}),
}
