/**
 * Slider archetype: color palette. The `--slider-fill` CSS variable keyed by
 * color, and the `--slider-track` variable that each color shares.
 * `<Slider />` paints via a webkit / moz gradient on the native input;
 * `<RangeSlider />` paints a dedicated fill element. Both surfaces share
 * this table.
 *
 * Layer: kiso · Archetype: slider · Concern: color
 */

import { mode } from '../../../core/recipe'

/** The color of the part of the track that is not filled. It is the same for each fill color. */
export const track = mode(
	'[--slider-track:var(--color-zinc-200)]',
	'dark:[--slider-track:var(--color-zinc-700)]',
)

export const color = {
	zinc: mode('[--slider-fill:var(--color-zinc-600)]', 'dark:[--slider-fill:var(--color-zinc-400)]'),
	red: mode('[--slider-fill:var(--color-red-600)]', 'dark:[--slider-fill:var(--color-red-500)]'),
	// Amber keeps one shade in both modes.
	amber: mode('[--slider-fill:var(--color-amber-500)]'),
	green: mode(
		'[--slider-fill:var(--color-green-600)]',
		'dark:[--slider-fill:var(--color-green-500)]',
	),
	blue: mode('[--slider-fill:var(--color-blue-600)]', 'dark:[--slider-fill:var(--color-blue-500)]'),
} as const
