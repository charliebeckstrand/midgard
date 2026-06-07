/**
 * Iro solid — opaque fill palette. The colour paints the background;
 * text is white (or amber-950 against amber to preserve contrast).
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
	// Inset ring-offset matching the fill. On focus the foreground ring
	// (`ring-current`) floats a step inside the fill instead of sitting flush,
	// reading as a focus halo rather than a border — and never escaping the box,
	// so no overflow can clip it. Mirrors `bg` so the offset can't drift from
	// the fill; the matching offset width rides the button's solid variant.
	ringOffset: shades({
		zinc: 'focus-visible:ring-offset-zinc-600',
		red: 'focus-visible:ring-offset-red-600',
		amber: 'focus-visible:ring-offset-amber-500',
		green: 'focus-visible:ring-offset-green-700',
		blue: 'focus-visible:ring-offset-blue-600',
	}),
}
