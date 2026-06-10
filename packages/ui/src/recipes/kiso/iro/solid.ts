/**
 * Iro solid: opaque fill palette. The colour paints the background;
 * text is white (amber-950 against amber).
 * Hover darkens the fill by one step.
 *
 * Layer: kiso · Concern: solid palette
 */

import { shades } from '../../../core/recipe'

export const solid = {
	bg: shades({
		zinc: 'bg-zinc-600',
		red: 'bg-red-600',
		amber: 'bg-amber-500',
		green: 'bg-green-700',
		blue: 'bg-blue-600',
	}),
	text: shades({
		zinc: 'text-white',
		red: 'text-white',
		amber: 'text-amber-950',
		green: 'text-white',
		blue: 'text-white',
	}),
	hover: shades({
		zinc: 'not-disabled:hover:bg-zinc-700',
		red: 'not-disabled:hover:bg-red-700',
		amber: 'not-disabled:hover:bg-amber-600',
		green: 'not-disabled:hover:bg-green-800',
		blue: 'not-disabled:hover:bg-blue-700',
	}),
}
