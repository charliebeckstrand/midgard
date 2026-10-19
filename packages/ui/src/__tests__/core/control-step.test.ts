// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { densitySteps } from '../../core/density'

// Each ramp of a control has a value of its own at each step, from `xs` to
// `xl` (the density geometry plan of 2026-10-09). `control-step.test-d.ts`
// holds the types of the `size` prop that follow from it.

describe('the density steps', () => {
	it('run from xs to xl', () => {
		expect(densitySteps).toEqual(['xs', 'sm', 'md', 'lg', 'xl'])
	})
})
