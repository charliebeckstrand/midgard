import { describe, expectTypeOf, it } from 'vitest'
import type { FormFiltersFieldRenderProps } from '../../modules/form'

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
