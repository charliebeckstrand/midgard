import { memo } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Calendar } from '../../components/calendar'
import { CalendarDayCell } from '../../components/calendar/calendar-day-cell'
import { act, fireEvent, renderUI, screen } from '../helpers'

/**
 * A select in the calendar renders only the day cells that change.
 *
 * Each day cell is memoized, and each takes the `onSelect` of the calendar.
 * That handler depended on the `setTouched` of `useFormValue`, which was a new
 * function on each render. A select therefore rendered all the cells of the
 * month. The count needs a module mock, so this suite sits in `boundary/`.
 */
vi.mock('../../components/calendar/calendar-day-cell', async (importActual) => {
	const actual = await importActual<typeof import('../../components/calendar/calendar-day-cell')>()

	// `CalendarDayCell` is a memo object. The mock wraps its inner function and
	// memoizes it again, so the memo still decides when a cell renders.
	return { ...actual, CalendarDayCell: memo(vi.fn(actual.CalendarDayCell.type)) }
})

describe('calendar day cell renders', () => {
	it('renders only the cells whose selection changed on a select', () => {
		renderUI(<Calendar defaultValue={new Date(2025, 5, 10)} />)

		const days = screen.getAllByRole('option')

		// A month of 30 days renders each cell at mount.
		expect(days.length).toBe(30)

		const day = days.find((cell) => cell.textContent === '15') as HTMLElement

		vi.mocked(CalendarDayCell.type).mockClear()

		act(() => {
			fireEvent.click(day)
		})

		// The old selected day and the new one. The rest of the month holds.
		expect(vi.mocked(CalendarDayCell.type).mock.calls.length).toBeLessThanOrEqual(2)
	})
})
