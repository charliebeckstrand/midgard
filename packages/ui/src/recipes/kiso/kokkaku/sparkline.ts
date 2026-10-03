/**
 * Kokkaku skeleton: sparkline. A plain rounded block on the chart's
 * width × height silhouette per size step, standing in for the drawn series.
 *
 * `box` is the width and the height of the real SVG. The Sparkline kata reads
 * it. Each is a stepped `density-*` class, so the silhouette takes the step of
 * its nearest density scope, as the sparkline does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: sparkline
 */

import { dan } from '../dan'
import { kasane } from '../kasane'

const { rounded } = kasane

const box = [dan.size.sparklineWidth, dan.size.sparkline] as const

export const sparkline = {
	base: [rounded.sm, ...box],
	box,
	density: true,
	// Inline-level, as the `inline-block` sparkline is, so the silhouette flows where the chart would.
	inline: true,
} as const
