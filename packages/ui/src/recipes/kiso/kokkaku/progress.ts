/**
 * Kokkaku skeleton: progress. The bar fills its parent at the track
 * height per size step; the gauge is a circle on its diameter scale.
 *
 * `height` is the track height of the real bar, and `diameter` is the diameter
 * of the real gauge. The Progress kata reads both. Each is a stepped
 * `density-*` class, so the silhouette takes the step of its nearest density
 * scope, as the bar and the gauge do.
 *
 * Layer: kiso · Concern: skeleton form · Unit: progress
 */

import { dan } from '../dan'
import { kasane } from '../kasane'

const { rounded } = kasane

const height = dan.size.lineTiny

const diameter = dan.size.gauge

export const progress = {
	bar: {
		base: ['w-full', rounded.full, height],
		height,
		density: true,
	},
	gauge: {
		base: [rounded.full, diameter],
		diameter,
		density: true,
	},
} as const
