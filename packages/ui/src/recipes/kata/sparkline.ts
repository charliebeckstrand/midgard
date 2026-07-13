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
	neutral: {
		stroke: mode('stroke-neutral-600', 'dark:stroke-neutral-400'),
		fill: mode('fill-neutral-600', 'dark:fill-neutral-400'),
	},
	danger: {
		stroke: mode('stroke-danger-600', 'dark:stroke-danger-500'),
		fill: mode('fill-danger-600', 'dark:fill-danger-500'),
	},
	warning: {
		stroke: mode('stroke-warning-600', 'dark:stroke-warning-500'),
		fill: mode('fill-warning-600', 'dark:fill-warning-500'),
	},
	success: {
		stroke: mode('stroke-success-600', 'dark:stroke-success-500'),
		fill: mode('fill-success-600', 'dark:fill-success-500'),
	},
	primary: {
		stroke: mode('stroke-primary-600', 'dark:stroke-primary-500'),
		fill: mode('fill-primary-600', 'dark:fill-primary-500'),
	},
}

export const k = defineRecipe(
	{
		base: ['inline-block', 'align-middle'],
		skeleton: kokkaku.sparkline,
	},
	{ color },
)
