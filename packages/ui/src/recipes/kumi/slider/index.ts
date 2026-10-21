/**
 * The slider group: the shared structure of `<Slider />` and `<RangeSlider />`.
 * The `base` slot carries the `--slider-track` variable, and the `color` axis
 * sets the `--slider-fill` variable. Slider paints them through a WebKit and a
 * Gecko gradient on the native input. RangeSlider paints a fill element.
 */

import { defineScale } from '../../../core/density'
import { defineGroup, mode } from '../../../core/recipe'
import { dan } from '../../kiso'

/** The size scale of the sliders: the steps of their padding, track, and thumb. */
export const scale = defineScale(
	dan.space.slider.y,
	dan.size.slider.track,
	dan.space.slider.track.y,
	dan.size.thumb.base,
)

export const slider = defineGroup({
	slots: {
		base: {
			/** The color of the part of the track that is not filled. It is the same for each fill color. */
			base: mode(
				'[--slider-track:var(--color-zinc-200)]',
				'dark:[--slider-track:var(--color-zinc-700)]',
			),
			/** The color of the filled part of the track. */
			color: {
				zinc: mode(
					'[--slider-fill:var(--color-zinc-600)]',
					'dark:[--slider-fill:var(--color-zinc-400)]',
				),
				red: mode(
					'[--slider-fill:var(--color-red-600)]',
					'dark:[--slider-fill:var(--color-red-500)]',
				),
				// Amber keeps one shade in both modes.
				amber: mode('[--slider-fill:var(--color-amber-500)]'),
				green: mode(
					'[--slider-fill:var(--color-green-600)]',
					'dark:[--slider-fill:var(--color-green-500)]',
				),
				blue: mode(
					'[--slider-fill:var(--color-blue-600)]',
					'dark:[--slider-fill:var(--color-blue-500)]',
				),
			},
		},
	},
	defaults: { color: 'blue' },
})
