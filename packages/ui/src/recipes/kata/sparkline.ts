/**
 * Sparkline kata: object-literal surface for the in-cell trend chart. The root
 * is a bare inline box (the SVG sizes itself from its `viewBox`); the only axis
 * is `color`, a local per-colour `stroke` / `fill` table authored inline with
 * `mode()` — the line and end-point read `stroke`, the bars and area fill read
 * `fill`. The shades track `kata/progress` so a sparkline and a progress bar in
 * the same colour read as one family.
 */

import { defineRecipe, mode } from '../../core/recipe'
import { kokkaku } from '../kiso'

/**
 * Per-colour `stroke` (line / point) and `fill` (bars / area) classes. The area
 * fill dials its own opacity down at the render site, so one solid `fill` slice
 * serves both the bars and the translucent area.
 */
const color = {
	zinc: {
		stroke: mode('stroke-zinc-600', 'dark:stroke-zinc-400'),
		fill: mode('fill-zinc-600', 'dark:fill-zinc-400'),
	},
	red: {
		stroke: mode('stroke-red-600', 'dark:stroke-red-500'),
		fill: mode('fill-red-600', 'dark:fill-red-500'),
	},
	amber: {
		stroke: mode('stroke-amber-600', 'dark:stroke-amber-500'),
		fill: mode('fill-amber-600', 'dark:fill-amber-500'),
	},
	green: {
		stroke: mode('stroke-green-600', 'dark:stroke-green-500'),
		fill: mode('fill-green-600', 'dark:fill-green-500'),
	},
	blue: {
		stroke: mode('stroke-blue-600', 'dark:stroke-blue-500'),
		fill: mode('fill-blue-600', 'dark:fill-blue-500'),
	},
}

export const k = defineRecipe(
	{
		base: ['inline-block', 'align-middle'],
		skeleton: kokkaku.sparkline,
	},
	{ color },
)
