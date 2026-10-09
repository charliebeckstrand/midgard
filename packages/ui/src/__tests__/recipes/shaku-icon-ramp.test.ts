// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { densitySteps } from '../../core/density'
import { shaku } from '../../recipes/kiso/shaku'
import { findSteps } from '../helpers/class-stops'

/**
 * The icon forms repeat the icon scale, the ramps in a stepped `density-size` class. Tailwind needs
 * each class as a literal, so the forms cannot be built from the scale. This pins each step of each
 * form to the scale.
 */
const scale = (step: (typeof densitySteps)[number]) => shaku.icon.size[step].replace('size-', '')

describe('shaku icon ramps', () => {
	it('icon.base holds the icon size of each step', () => {
		const steps = findSteps([shaku.icon.base], 'density-size-')

		for (const step of densitySteps) expect(steps[step]).toBe(scale(step))
	})

	it('icon.slot.base holds the icon slot size of each step', () => {
		const steps = findSteps([shaku.icon.slot.base], '*:data-[slot=icon]:density-size-')

		for (const step of densitySteps) expect(steps[step]).toBe(scale(step))

		expect(shaku.icon.slot.base).toContain('*:data-[slot=icon]:shrink-0')
	})

	it('icon.md holds the icon slot size of md', () => {
		expect(shaku.icon.slot.md).toBe(
			`*:data-[slot=icon]:size-${scale('md')} *:data-[slot=icon]:shrink-0`,
		)
	})
})
