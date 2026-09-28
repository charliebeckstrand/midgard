// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { densitySteps, toInnerStep } from '../../core/density'
import { headingRamp, headingScale, k, titleRamp, titleSize } from '../../recipes/kata/heading'
import { ji } from '../../recipes/kiso'
import { findSteps } from '../helpers/class-stops'

/**
 * The ramps repeat `headingScale` in stepped classes. Tailwind needs each class as a literal, so a
 * ramp cannot be built from the ladder. This pins each step of each ramp to the ladder. An outer
 * step takes the rung of its ambient neighbor.
 */
const levels = [1, 2, 3, 4, 5, 6] as const

describe('heading ramps', () => {
	it.each(levels)('holds the size of each step for level %i', (level) => {
		const steps = findSteps([headingRamp[level]], 'density-text-')

		for (const step of densitySteps) {
			expect(`text-${steps[step]}`).toBe(ji.size[headingScale(level, toInnerStep(step))])
		}
	})

	it.each(levels)('holds the skeleton height of each step for level %i', (level) => {
		const steps = findSteps([k.skeleton.ramp[level]], 'density-h-')

		for (const step of densitySteps) {
			expect(`h-${steps[step]}`).toBe(k.skeleton.scale[headingScale(level, toInnerStep(step))])
		}
	})

	it('holds the titleSize class of each step in the title ramp', () => {
		const steps = findSteps([titleRamp], 'density-text-')

		for (const step of densitySteps) {
			expect(`text-${steps[step]}`).toBe(titleSize(toInnerStep(step)))
		}
	})
})
