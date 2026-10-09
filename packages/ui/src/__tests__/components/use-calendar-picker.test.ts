import { act, renderHook } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import {
	CalendarPickerGrid,
	type CalendarPickerGridCell,
} from '../../components/calendar/calendar-picker-grid'
import { useCalendarPicker } from '../../components/calendar/use-calendar-picker'
import { fireEvent, renderUI, screen, waitFor } from '../helpers'

// Short labels, M1 to M12. Only the Tab stop cases read a month label.
const monthLabels = Array.from({ length: 12 }, (_, i) => `M${i + 1}`)

// The shipped picker sits in a floating-ui popover, which CONVENTIONS §10.3
// bars from a test; the hook is the synchronous seam under it, so these cases
// render it alone and read the cell list it derives.
function setup(year: number, localeTag = 'en-US') {
	return renderHook(() =>
		useCalendarPicker({
			year,
			month: 0,
			today: null,
			monthLabels,
			localeTag,
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

		expect(first.result.current.viewConfig.centerLabel).toBe('1')

		const last = setup(9999)

		act(() => last.result.current.viewConfig.onNext())

		expect(last.result.current.viewConfig.centerLabel).toBe('9999')
	})
})

// The day numbers and the month labels use the digits of the calendar locale,
// and the picker years wrote Latin digits next to them.
describe('useCalendarPicker: year digits', () => {
	it('writes the years in the digits of the locale', () => {
		// `ar-EG` writes Arabic-Indic digits.
		const { result } = setup(2025, 'ar-EG')

		expect(result.current.viewConfig.centerLabel).toBe('٢٠٢٥')

		act(() => result.current.viewConfig.onCenter())

		expect(result.current.viewConfig.centerLabel).toBe('٢٠٢٠–٢٠٢٩')

		const { cells } = result.current.viewConfig

		expect([cells[0]?.label, cells[11]?.label]).toEqual(['٢٠١٩', '٢٠٣٠'])
	})

	it('writes the years with no grouping separator', () => {
		// As a number, `en-US` writes 2025 as "2,025".
		const { result } = setup(2025, 'en-US')

		expect(result.current.viewConfig.centerLabel).toBe('2025')

		act(() => result.current.viewConfig.onCenter())

		expect(result.current.viewConfig.centerLabel).toBe('2020–2029')

		expect(result.current.viewConfig.cells[1]?.label).toBe('2020')
	})
})

/**
 * Renders the open picker grid that the hook drives, with no popover around it.
 * In the shipped picker, the grid mounts in the popover portal a commit after
 * `open` turns on.
 */
function OpenPickerGrid({ year, month }: { year: number; month: number }) {
	const picker = useCalendarPicker({
		year,
		month,
		today: null,
		monthLabels,
		localeTag: 'en-US',
		onNavigate: () => {},
		open: true,
		onOpenChange: () => {},
	})

	return createElement(CalendarPickerGrid, {
		headerRef: picker.pickerHeaderRef,
		gridRef: picker.pickerGridRef,
		onHeaderKeyDown: picker.handleHeaderKeyDown,
		onGridKeyDown: picker.handleGridKeyDown,
		...picker.viewConfig,
	})
}

// The month listbox is one Tab stop. The picker header holds plain buttons, and
// each one is a Tab stop.
describe('useCalendarPicker: Tab stops', () => {
	it('holds one Tab stop in the month listbox, on the selected month', async () => {
		renderUI(createElement(OpenPickerGrid, { year: 2026, month: 5 }))

		const stops = () => screen.getAllByRole('option').filter((option) => option.tabIndex === 0)

		await waitFor(() =>
			expect(stops()).toEqual([screen.getByRole('option', { name: 'M6', selected: true })]),
		)
	})

	it('keeps the picker header controls as plain buttons, each a Tab stop', () => {
		renderUI(createElement(OpenPickerGrid, { year: 2026, month: 5 }))

		expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()

		const controls = ['Previous year', '2026', 'Next year'].map((name) =>
			screen.getByRole('button', { name }),
		)

		expect(controls.map((control) => control.tabIndex)).toEqual([0, 0, 0])
	})
})

// ArrowDown from the picker header enters the month listbox on its Tab stop,
// the selected month, as an open of the picker does.
describe('useCalendarPicker: header ArrowDown', () => {
	it('focuses the selected month', async () => {
		renderUI(createElement(OpenPickerGrid, { year: 2026, month: 5 }))

		const selected = screen.getByRole('option', { name: 'M6', selected: true })

		await waitFor(() => expect(selected.tabIndex).toBe(0))

		const previous = screen.getByRole('button', { name: 'Previous year' })

		act(() => previous.focus())

		fireEvent.keyDown(previous, { key: 'ArrowDown' })

		expect(document.activeElement).toBe(selected)
	})
})

/**
 * Renders the picker grid that the hook drives while `mounted`. The popover
 * keeps the grid mounted through its exit animation, so a reopen in that
 * window finds the same grid node.
 */
function PickerGrid({ open, mounted }: { open: boolean; mounted: boolean }) {
	const picker = useCalendarPicker({
		year: 2026,
		month: 5,
		today: null,
		monthLabels,
		localeTag: 'en-US',
		onNavigate: () => {},
		open,
		onOpenChange: () => {},
	})

	if (!mounted) return null

	return createElement(CalendarPickerGrid, {
		headerRef: picker.pickerHeaderRef,
		gridRef: picker.pickerGridRef,
		onHeaderKeyDown: picker.handleHeaderKeyDown,
		onGridKeyDown: picker.handleGridKeyDown,
		...picker.viewConfig,
	})
}

describe('useCalendarPicker: open focus', () => {
	it('focuses the selected month when the grid mounts on open', async () => {
		const { rerender } = renderUI(createElement(PickerGrid, { open: false, mounted: false }))

		rerender(createElement(PickerGrid, { open: true, mounted: true }))

		const selected = screen.getByRole('option', { name: 'M6', selected: true })

		await waitFor(() => expect(document.activeElement).toBe(selected))

		expect(selected.tabIndex).toBe(0)
	})

	// The grid node stays through the exit animation. A reopen in that window
	// must focus the grid and restore its Tab stop again.
	it('focuses the selected month on a reopen during the exit animation', async () => {
		const { rerender } = renderUI(createElement(PickerGrid, { open: true, mounted: true }))

		const selected = screen.getByRole('option', { name: 'M6', selected: true })

		await waitFor(() => expect(document.activeElement).toBe(selected))

		rerender(createElement(PickerGrid, { open: false, mounted: true }))

		act(() => selected.blur())

		expect(document.activeElement).not.toBe(selected)

		rerender(createElement(PickerGrid, { open: true, mounted: true }))

		await waitFor(() => expect(document.activeElement).toBe(selected))

		expect(selected.tabIndex).toBe(0)

		expect(screen.getByRole('option', { name: 'M6', selected: true })).toBe(selected)
	})
})
