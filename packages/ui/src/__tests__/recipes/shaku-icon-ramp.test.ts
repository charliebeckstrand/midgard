// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { densitySteps } from '../../recipes/kiso'
import { shaku } from '../../recipes/kiso/shaku'

/**
 * The icon ramps repeat the icon scale under the `density-*` variants. Tailwind needs each class as
 * a literal, so the ramps cannot be built from the scale. This pins each ramp to the scale.
 */
const classes = (value: string | readonly string[]) => [value].flat().join(' ').split(/\s+/)

const scaleSteps = densitySteps.filter((step) => step in shaku.iconSize)

describe('shaku icon ramps', () => {
	it('iconRamp holds the iconSize class of each step, and nothing else', () => {
		const expected = scaleSteps.map(
			(step) => `density-${step}:${shaku.iconSize[step as keyof typeof shaku.iconSize]}`,
		)

		expect(classes(shaku.iconRamp).sort()).toEqual(expected.sort())
	})

	it('iconSlotRamp holds the icon slot classes of each step', () => {
		const expected = scaleSteps.flatMap((step) =>
			classes(shaku.icon[step as keyof typeof shaku.icon])
				.filter((name) => !name.endsWith(':shrink-0'))
				.map((name) => `density-${step}:${name}`),
		)

		expect(
			classes(shaku.iconSlotRamp)
				.filter((name) => name.startsWith('density-'))
				.sort(),
		).toEqual(expected.sort())

		expect(classes(shaku.iconSlotRamp)).toContain('*:data-[slot=icon]:shrink-0')
	})
})
