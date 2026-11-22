import { describe, expectTypeOf, it } from 'vitest'
import type { FormFiltersFieldRenderProps, FormFiltersRowProps } from '../../modules/form'

describe('FormFiltersField value types', () => {
	it('keeps the value unknown when the call site names no type', () => {
		expectTypeOf<FormFiltersFieldRenderProps['value']>().toEqualTypeOf<unknown>()
	})

	it('types the render-prop value and setter from the type argument', () => {
		expectTypeOf<FormFiltersFieldRenderProps<number>['value']>().toEqualTypeOf<number | undefined>()

		expectTypeOf<FormFiltersFieldRenderProps<number>['onValueChange']>()
			.parameter(0)
			.toEqualTypeOf<number | undefined>()
	})
})

describe('FormFiltersRow props', () => {
	it('leaves out the attributes that the scroll region of a rail writes', () => {
		expectTypeOf<FormFiltersRowProps>().not.toHaveProperty('role')

		expectTypeOf<FormFiltersRowProps>().not.toHaveProperty('tabIndex')

		expectTypeOf<FormFiltersRowProps>().not.toHaveProperty('aria-label')

		expectTypeOf<FormFiltersRowProps>().not.toHaveProperty('aria-labelledby')

		expectTypeOf<FormFiltersRowProps>().toHaveProperty('aria-describedby')
	})
})
