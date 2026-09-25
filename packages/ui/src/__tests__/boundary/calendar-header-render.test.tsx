import { describe, expect, it, vi } from 'vitest'
import { CalendarPicker } from '../../components/calendar/calendar-picker'
import { DatePicker } from '../../components/date-picker'
import { act, fireEvent, getSlot, renderUI, screen, userEvent } from '../helpers'

/**
 * A move inside the day grid renders no part of the calendar header.
 *
 * The header holds the month/year picker, its popover, and three buttons. It
 * rendered again on each move of the roved day and on each range preview,
 * because the calendar did not memoize it and its month steppers took a new
 * identity on each month.
 *
 * The suite counts the renders of the month/year picker, a plain component in
 * the header. It renders each time the header does, and a mock of the header
 * itself would have to add a memo of its own. The count needs a module mock,
 * so this suite sits in `boundary/`.
 */
vi.mock('../../components/calendar/calendar-picker', async (importActual) => {
	const actual = await importActual<typeof import('../../components/calendar/calendar-picker')>()

	return { ...actual, CalendarPicker: vi.fn(actual.CalendarPicker) }
})

describe('calendar header renders', () => {
	it('renders no header for a move of the roved day', async () => {
		const user = userEvent.setup({ delay: null })

		const { container } = renderUI(<DatePicker defaultValue={new Date(2025, 5, 10)} />)

		await user.click(getSlot<HTMLButtonElement>(container, 'datepicker-button'))

		// The first arrow puts the highlight on the grid.
		await user.keyboard('{ArrowDown}')

		vi.mocked(CalendarPicker).mockClear()

		await user.keyboard('{ArrowRight}{ArrowRight}{ArrowDown}')

		expect(vi.mocked(CalendarPicker)).not.toHaveBeenCalled()
	})

	it('renders no header for a move of the range preview', async () => {
		const { container } = renderUI(
			<DatePicker range defaultValue={[new Date(2025, 5, 1), new Date(2025, 5, 3)]} />,
		)

		await userEvent
			.setup({ delay: null })
			.click(getSlot<HTMLButtonElement>(container, 'datepicker-button'))

		const days = screen.getAllByRole('option')

		const day = (label: string) => days.find((cell) => cell.textContent === label) as HTMLElement

		act(() => {
			fireEvent.click(day('5'))
		})

		vi.mocked(CalendarPicker).mockClear()

		act(() => {
			fireEvent.mouseLeave(day('5'))

			fireEvent.mouseEnter(day('9'))
		})

		expect(vi.mocked(CalendarPicker)).not.toHaveBeenCalled()
	})
})
