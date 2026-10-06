// @vitest-environment node
import { describe, expectTypeOf, it } from 'vitest'
import type { ColorPickerProps } from '../../components/color'
import type { ComboboxProps } from '../../components/combobox'
import type { FloatingPlacement } from '../../hooks'

/** Every floating picker takes the `<side>-auto` placement that Popover, Menu, and DatePicker take. */
describe('the placement prop of Combobox and ColorPicker', () => {
	it('takes a `<side>-auto` placement', () => {
		expectTypeOf<'bottom-auto'>().toExtend<NonNullable<ComboboxProps<string>['placement']>>()

		expectTypeOf<'bottom-auto'>().toExtend<NonNullable<ColorPickerProps['placement']>>()

		expectTypeOf<FloatingPlacement>().toExtend<NonNullable<ComboboxProps<string>['placement']>>()

		expectTypeOf<FloatingPlacement>().toExtend<NonNullable<ColorPickerProps['placement']>>()
	})
})
