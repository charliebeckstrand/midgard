// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { densitySteps } from '../../core/density'
import { ramp, size } from '../../recipes/kiso/ji/size'
import { findSteps } from '../helpers/class-stops'

/**
 * The text ramp repeats the steps of the size scale in a stepped `density-text` class. Tailwind
 * needs the class as a literal, so the ramp cannot be built from the scale. This pins each step
 * of the ramp to the scale.
 */
describe('ji text ramp', () => {
	it('holds the size class of each step', () => {
		const steps = findSteps([ramp], 'density-text-')

		for (const step of densitySteps) {
			expect(`text-${steps[step]}`).toBe(size[step])
		}
	})
})
