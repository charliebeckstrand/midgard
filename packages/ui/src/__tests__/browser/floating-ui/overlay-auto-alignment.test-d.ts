import { describe, expectTypeOf, it } from 'vitest'
import type { DatePickerProps } from '../../../components/date-picker'
import type { PopoverProps } from '../../../components/popover'
import type { TooltipProps } from '../../../components/tooltip'
import type { FloatingPlacement } from '../../../hooks'

describe('the placement prop of Popover, Tooltip, and DatePicker', () => {
	it('types placement as FloatingPlacement', () => {
		expectTypeOf<PopoverProps['placement']>().toEqualTypeOf<FloatingPlacement | undefined>()

		expectTypeOf<TooltipProps['placement']>().toEqualTypeOf<FloatingPlacement | undefined>()

		expectTypeOf<DatePickerProps['placement']>().toEqualTypeOf<FloatingPlacement | undefined>()
	})
})
