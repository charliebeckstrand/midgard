/**
 * Kokkaku skeleton: progress. The bar fills its parent at the track
 * height per size step; the gauge is a circle on its diameter scale.
 *
 * The bar takes the track height of the real bar (`dan.size.line.tiny`), and the
 * gauge takes the diameter of the real gauge (`dan.size.gauge`). Each is a stepped
 * `density-*` class, so the silhouette takes the step of its nearest density
 * scope, as the bar and the gauge do.
 *
 * Layer: kiso · Concern: skeleton form · Unit: progress
 */

import { dan } from '../dan'
import { kasane } from '../kasane'

const { rounded } = kasane

export const progress = {
	bar: {
		base: ['w-full', rounded.full, dan.size.line.tiny],
		density: true,
	},
	gauge: {
		base: [rounded.full, dan.size.gauge],
		density: true,
	},
} as const
