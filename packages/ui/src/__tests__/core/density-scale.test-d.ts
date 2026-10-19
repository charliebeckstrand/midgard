import { describe, expectTypeOf, it } from 'vitest'
import { defineScale, type RampSteps, type ScaleStep } from '../../core/density/scale'

describe('defineScale', () => {
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
