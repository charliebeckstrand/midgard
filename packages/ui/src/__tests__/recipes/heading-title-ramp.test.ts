// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { densitySteps, toAmbientStep } from '../../core/density'
import { titleRamp, titleSize } from '../../recipes/kata/heading'
import { findSteps } from '../helpers/class-stops'

/**
 * The title ramp repeats `titleSize` in a stepped `density-text` class. Tailwind needs the class
 * as a literal, so the ramp cannot be built from the heading scale. This pins each step of the
 * ramp to `titleSize`. An outer step takes the size of its ambient neighbor.
 */
describe('heading title ramp', () => {
	it('holds the titleSize class of each step', () => {
		const steps = findSteps([titleRamp], 'density-text-')

		for (const step of densitySteps) {
			expect(`text-${steps[step]}`).toBe(titleSize(toAmbientStep(step)))
		}
	})
})
