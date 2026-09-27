// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { densitySteps, toAmbientStep } from '../../core/density'
import { k as rating } from '../../recipes/kata/rating'
import { kokkaku } from '../../recipes/kiso'
import { findSteps } from '../helpers/class-stops'

/**
 * A skeleton follows the nearest density scope through a stepped class. Where the real component
 * reads a `size` map in JS, the stepped class repeats that map, because Tailwind needs each class
 * as a literal. This pins each step of each stepped class to the map. An outer step takes the
 * class of its ambient neighbor.
 */
const ramps: [string, unknown, string, string, Record<string, unknown>][] = [
	['progress bar', kokkaku.progress.bar.base, 'density-h-', 'h-', kokkaku.progress.bar.size],
	[
		'progress gauge',
		kokkaku.progress.gauge.base,
		'density-size-',
		'size-',
		kokkaku.progress.gauge.size,
	],
	['rating star', kokkaku.rating.star, 'density-size-', 'size-', kokkaku.rating.size],
	['rating gap', kokkaku.rating.gap, 'density-gap-', 'gap-', rating.config.variants.size ?? {}],
]

describe('skeleton ramps', () => {
	it.each(ramps)('the %s ramp holds the class of each step', (_, classes, stepped, plain, map) => {
		const steps = findSteps([classes], stepped)

		for (const step of densitySteps) {
			expect(`${plain}${steps[step]}`).toBe(map[toAmbientStep(step)])
		}
	})
})
