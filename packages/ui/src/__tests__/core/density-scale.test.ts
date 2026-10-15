// @vitest-environment node
import { describe, expect, expectTypeOf, it } from 'vitest'
import { defineScale, type RampSteps, type ScaleStep, stepsOfRamp } from '../../core/density/scale'

// A scale holds the steps at which a ramp renders a value of its own. A type
// reads them from the literal class, so a `size` prop offers only those steps.

describe('stepsOfRamp', () => {
	it('gives the inner steps for three values', () => {
		expect(stepsOfRamp('density-p-[2,3,4]')).toEqual(['sm', 'md', 'lg'])
	})

	it('gives an outer step for five values only when it differs from its neighbor', () => {
		expect(stepsOfRamp('density-size-[3,4,5,6,6]')).toEqual(['xs', 'sm', 'md', 'lg'])

		expect(stepsOfRamp('density-size-[3,4,5,6,8]')).toEqual(['xs', 'sm', 'md', 'lg', 'xl'])

		expect(stepsOfRamp('density-ms-[2,2,2.5,3,3.5]')).toEqual(['sm', 'md', 'lg', 'xl'])
	})

	it('reads a ring utility and the names of the text scale', () => {
		expect(stepsOfRamp('density-px-ring-[2.5,3,3.5]')).toEqual(['sm', 'md', 'lg'])

		expect(stepsOfRamp('density-text-[xs,sm,base,lg,lg]')).toEqual(['xs', 'sm', 'md', 'lg'])
	})

	it('throws for a list that the utility does not write', () => {
		expect(() => stepsOfRamp('density-p-[2,3]')).toThrow(/three or five/)

		expect(() => stepsOfRamp('p-2')).toThrow(/three or five/)
	})
})

describe('defineScale', () => {
	it('joins the steps of each ramp in step order', () => {
		const scale = defineScale('density-p-[2,3,4]', 'density-size-[3,4,5,6,6]')

		expect([...scale]).toEqual(['xs', 'sm', 'md', 'lg'])

		expectTypeOf<ScaleStep<typeof scale>>().toEqualTypeOf<'xs' | 'sm' | 'md' | 'lg'>()
	})

	it('types a scale of three-value ramps as the inner steps', () => {
		const scale = defineScale('density-text-[sm,base,lg]', 'density-gap-[1,2,3]')

		expectTypeOf<ScaleStep<typeof scale>>().toEqualTypeOf<'sm' | 'md' | 'lg'>()
	})

	it('types each step of a ramp with five distinct values', () => {
		expectTypeOf<RampSteps<'density-size-[3,4,5,6,8]'>>().toEqualTypeOf<
			'xs' | 'sm' | 'md' | 'lg' | 'xl'
		>()

		expectTypeOf<RampSteps<'density-text-[xs,sm,base,lg,lg]'>>().toEqualTypeOf<
			'xs' | 'sm' | 'md' | 'lg'
		>()
	})
})
