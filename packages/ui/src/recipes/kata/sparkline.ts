/**
 * Sparkline kata: the unit of the in-cell trend chart. The root slot is a bare
 * inline box, with no axis. The `svg` slot sizes the SVG at the step
 * of the nearest density scope, at 3:1 on each step (72×24, 96×32, 120×40).
 * `color` is the `iro.meter` table, which Progress also reads. The line and the
 * end point read `stroke`, and the bars and the area read `fill`. The area
 * fill sets its own opacity at the render site, so one solid `fill` row serves
 * both.
 */

import { defineScale } from '../../core/density'
import { defineKata } from '../../core/recipe'
import { dan, iro, kokkaku, ugoki } from '../kiso'

export const k = defineKata(
	{
		base: ['inline-block', 'align-middle'],
		slots: { svg: ['block', ...kokkaku.sparkline.box] },
	},
	// `motion` is the shared data-viz mark-reveal family: the same timings the
	// chart module draws with, so a sparkline and a chart animating side by side
	// read as one.
	{ color: iro.meter, motion: ugoki.mark, skeleton: kokkaku.sparkline },
)

/** The size scale of {@link Sparkline}: the steps of its box. */
export const scale = defineScale(dan.size.sparkline.base, dan.size.sparkline.width)
