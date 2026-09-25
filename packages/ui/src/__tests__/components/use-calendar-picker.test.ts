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

// `@internationalized/date` holds years 1 to 9999, and it clamps a year outside
// them. A pick of year 0 therefore showed year 1.
describe('useCalendarPicker: year limits', () => {
	/** Renders the picker on `year`, and opens the year grid. */
	function yearGrid(year: number) {
		const view = setup(year)

		act(() => view.result.current.viewConfig.onCenter())

		return view
	}

	function disabledKeys(cells: CalendarPickerGridCell[]) {
		return cells.filter((cell) => cell.disabled).map((cell) => cell.key)
	}

	it('disables the year cells before year 1', () => {
		const { result } = yearGrid(5)

		expect(disabledKeys(result.current.viewConfig.cells)).toEqual([-1, 0])
	})

	it('disables the year cells after year 9999', () => {
		const { result } = yearGrid(9995)

		expect(disabledKeys(result.current.viewConfig.cells)).toEqual([10_000])
	})

	it('keeps the first decade on a step back', () => {
		const { result } = yearGrid(5)

		act(() => result.current.viewConfig.onPrev())

		expect(result.current.viewConfig.cells[0]?.key).toBe(-1)
	})

	it('keeps the last decade on a step forward', () => {
		const { result } = yearGrid(9995)

		act(() => result.current.viewConfig.onNext())

		expect(result.current.viewConfig.cells[0]?.key).toBe(9989)
	})

	it('keeps year 1 and year 9999 on the month grid', () => {
		const first = setup(1)

		act(() => first.result.current.viewConfig.onPrev())

		expect(first.result.current.viewConfig.centerLabel).toBe(1)

		const last = setup(9999)

		act(() => last.result.current.viewConfig.onNext())

		expect(last.result.current.viewConfig.centerLabel).toBe(9999)
	})
})
