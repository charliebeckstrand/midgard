// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { densitySteps } from '../../core/density'
import { shaku } from '../../recipes/kiso/shaku'
import { findSteps } from '../helpers/class-stops'

/**
 * The icon ramps repeat the icon scale in a stepped `density-size` class. Tailwind needs each class
 * as a literal, so the ramps cannot be built from the scale. This pins each step of each ramp to
 * the scale. The `xl` step takes the `lg` size, because the scale has no `xl`.
 */
const scale = (step: (typeof densitySteps)[number]) =>
	shaku.iconSize[step === 'xl' ? 'lg' : step].replace('size-', '')

describe('shaku icon ramps', () => {
	it('iconRamp holds the iconSize of each step', () => {
		const steps = findSteps([shaku.iconRamp], 'density-size-')

		for (const step of densitySteps) expect(steps[step]).toBe(scale(step))
	})

	it('iconSlotRamp holds the icon slot size of each step', () => {
		const steps = findSteps([shaku.iconSlotRamp], '*:data-[slot=icon]:density-size-')

		for (const step of densitySteps) expect(steps[step]).toBe(scale(step))

		expect(shaku.iconSlotRamp).toContain('*:data-[slot=icon]:shrink-0')
	})
})
