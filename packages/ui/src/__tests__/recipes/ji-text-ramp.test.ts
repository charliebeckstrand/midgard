// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { densitySteps, toInnerStep } from '../../core/density'
import { size, textRamp } from '../../recipes/kiso/ji/size'
import { findSteps } from '../helpers/class-stops'

/**
 * The text ramp repeats the inner steps of the size scale in a stepped `density-text` class. Tailwind needs the class as a
 * literal, so the ramp cannot be built from the scale. This pins each step of the ramp to the
 * scale. An outer step takes the size of its ambient neighbor.
 */
describe('ji text ramp', () => {
	it('holds the size class of each step', () => {
		const steps = findSteps([textRamp], 'density-text-')

		for (const step of densitySteps) {
			expect(`text-${steps[step]}`).toBe(size[toInnerStep(step)])
		}
	})
})
