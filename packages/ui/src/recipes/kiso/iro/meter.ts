/**
 * Iro meter: the shade that a measured value paints in, per palette color. The
 * progress bar fills with `bg`, and the progress gauge draws its ring with
 * `stroke`. A sparkline draws its line and end point with `stroke`, and its
 * bars and area with `fill`. Thus a sparkline and a progress bar in the same
 * color show as one family.
 *
 * Tailwind scans only whole class literals, so each utility has its own row.
 * Keep the shades of the three rows the same.
 *
 * Layer: kiso · Concern: meter color
 */

import { type Color, mode } from '../../../core/recipe'

export const meter = {
	zinc: {
		bg: mode('bg-zinc-600', 'dark:bg-zinc-400'),
		stroke: mode('stroke-zinc-600', 'dark:stroke-zinc-400'),
		fill: mode('fill-zinc-600', 'dark:fill-zinc-400'),
	},
	red: {
		bg: mode('bg-red-600', 'dark:bg-red-500'),
		stroke: mode('stroke-red-600', 'dark:stroke-red-500'),
		fill: mode('fill-red-600', 'dark:fill-red-500'),
	},
	amber: {
		bg: mode('bg-amber-600', 'dark:bg-amber-500'),
		stroke: mode('stroke-amber-600', 'dark:stroke-amber-500'),
		fill: mode('fill-amber-600', 'dark:fill-amber-500'),
	},
	green: {
		bg: mode('bg-green-600', 'dark:bg-green-500'),
		stroke: mode('stroke-green-600', 'dark:stroke-green-500'),
		fill: mode('fill-green-600', 'dark:fill-green-500'),
	},
	blue: {
		bg: mode('bg-blue-600', 'dark:bg-blue-500'),
		stroke: mode('stroke-blue-600', 'dark:stroke-blue-500'),
		fill: mode('fill-blue-600', 'dark:fill-blue-500'),
	},
} as const satisfies Record<Color, Record<'bg' | 'stroke' | 'fill', string[]>>
