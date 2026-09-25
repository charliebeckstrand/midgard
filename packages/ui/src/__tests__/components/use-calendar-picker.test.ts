import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { CalendarPickerGridCell } from '../../components/calendar/calendar-picker-grid'
import { useCalendarPicker } from '../../components/calendar/use-calendar-picker'

// No case reads a month label; the year grid is the subject.
const monthLabels = Array.from({ length: 12 }, (_, i) => `M${i + 1}`)

// The shipped picker sits in a floating-ui popover, which CONVENTIONS §10.3
// bars from a test; the hook is the synchronous seam under it, so these cases
// render it alone and read the cell list it derives.
function setup(year: number) {
	return renderHook(() =>
		useCalendarPicker({
			year,
			month: 0,
			today: null,
			monthLabels,
			onNavigate: () => {},
			open: false,
			onOpenChange: () => {},
		}),
	)
}

function selectedKeys(cells: CalendarPickerGridCell[]) {
	return cells.filter((cell) => cell.selected).map((cell) => cell.key)
}

describe('useCalendarPicker: year grid selection', () => {
	it('marks the picker year after the header steps it away from the calendar year', () => {
		const { result } = setup(2026)

		// The two years agree until the header pages one of them, and a grid that
		// marks the wrong year is indistinguishable while they agree. Two steps
		// move pickerYear to 2028 and keep the calendar on 2026.
		act(() => result.current.viewConfig.onNext())

		act(() => result.current.viewConfig.onNext())

		act(() => result.current.viewConfig.onCenter())

		expect(result.current.viewConfig.gridLabel).toBe('Select year')

		expect(selectedKeys(result.current.viewConfig.cells)).toEqual([2028])
	})

	it('marks the calendar year while the picker year still holds it', () => {
		const { result } = setup(2026)

		act(() => result.current.viewConfig.onCenter())

		expect(selectedKeys(result.current.viewConfig.cells)).toEqual([2026])
	})
})
