// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { densitySteps } from '../../core/density'
import { shaku } from '../../recipes/kiso/shaku'
import { findSteps } from '../helpers/class-stops'

/**
 * The icon forms repeat the icon scale, the ramps in a stepped `density-size` class. Tailwind needs
 * each class as a literal, so the forms cannot be built from the scale. This pins each step of each
 * form to the scale. The `xl` step takes the `lg` size, because the scale has no `xl`.
 */
const scale = (step: (typeof densitySteps)[number]) =>
	shaku.icon.size[step === 'xl' ? 'lg' : step].replace('size-', '')

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

	it('icon.row holds the icon size of each inner step', () => {
		const inner = (step: (typeof densitySteps)[number]) => scale(step === 'xs' ? 'sm' : step)

		const base = findSteps([shaku.icon.row.base], 'density-size-')

		const slot = findSteps([shaku.icon.row.slot], '*:data-[slot=icon]:density-size-')

		for (const step of densitySteps) {
			expect(base[step]).toBe(inner(step))
			expect(slot[step]).toBe(inner(step))
		}

		expect(shaku.icon.row.slot).toContain('*:data-[slot=icon]:shrink-0')
	})

	it('icon.md holds the icon slot size of md', () => {
		expect(shaku.icon.slot.md).toBe(
			`*:data-[slot=icon]:size-${scale('md')} *:data-[slot=icon]:shrink-0`,
		)
	})
})
