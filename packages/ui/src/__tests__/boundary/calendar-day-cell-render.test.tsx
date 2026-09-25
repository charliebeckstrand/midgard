import { createRef, memo } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Calendar, type CalendarHandle, CalendarRange } from '../../components/calendar'
import { CalendarDayCell } from '../../components/calendar/calendar-day-cell'
import { isSameDay } from '../../components/calendar/calendar-utilities'
import { DatePicker } from '../../components/date-picker'
import { act, fireEvent, getSlot, renderUI, screen, userEvent } from '../helpers'

/**
 * A select in the calendar renders only the day cells that change.
 *
 * Each day cell is memoized, and each takes the `onSelect` of the calendar.
 * That handler depended on the `setTouched` of `useFormValue`, which was a new
 * function on each render. A select therefore rendered all the cells of the
 * month.
 *
 * The range picker gave each cell new hover handlers on each render, and it
 * stored each hover, also before the first endpoint and on the same day. A
 * crossing therefore rendered the month once or more. Now it renders only the
 * cells at the moved end of the band.
 *
 * The cache that keeps those handlers kept one for each day of each month that
 * the reader visited, for the life of the `onHoverDate` callback. It now keys
 * each handler on the `Date` of its cell, so a month off screen frees its
 * handlers.
 *
 * The count and the handler reads need a module mock, so this suite sits in
 * `boundary/`.
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

	/** Opens a range picker on June 2025, and returns its day cells. */
	async function openRange() {
		const { container } = renderUI(
			<DatePicker range defaultValue={[new Date(2025, 5, 1), new Date(2025, 5, 3)]} />,
		)

		await userEvent
			.setup({ delay: null })
			.click(getSlot<HTMLButtonElement>(container, 'datepicker-button'))

		const days = screen.getAllByRole('option')

		return (label: string) => days.find((cell) => cell.textContent === label) as HTMLElement
	}

	/** Moves the pointer from one day to the next, as one gesture. */
	function cross(from: HTMLElement, to: HTMLElement) {
		act(() => {
			fireEvent.mouseLeave(from)

			fireEvent.mouseEnter(to)
		})
	}

	it('renders no cell for a hover before the first endpoint', async () => {
		const day = await openRange()

		vi.mocked(CalendarDayCell.type).mockClear()

		cross(day('10'), day('11'))

		expect(vi.mocked(CalendarDayCell.type)).not.toHaveBeenCalled()
	})

	it('renders only the cells at the moved end of the band', async () => {
		const day = await openRange()

		act(() => {
			fireEvent.click(day('5'))
		})

		cross(day('5'), day('10'))

		vi.mocked(CalendarDayCell.type).mockClear()

		cross(day('10'), day('11'))

		// Day 10 leaves the edge of the band, and day 11 becomes the edge.
		expect(vi.mocked(CalendarDayCell.type).mock.calls.length).toBeLessThanOrEqual(2)
	})

	/** The enter handler that the last render of the cell for June 5, 2025 took. */
	function enterOfJuneFifth(): (() => void) | undefined {
		return vi
			.mocked(CalendarDayCell.type)
			.mock.calls.findLast(([props]) => isSameDay(props.date, new Date(2025, 5, 5)))?.[0]
			.onMouseEnter
	}

	it('gives a month that the reader revisits new hover handlers', () => {
		const ref = createRef<CalendarHandle>()

		// One identity for the life of the range, as the DatePicker callback has.
		const onHoverDate = () => {}

		const june = (rangeEnd: Date | null) => (
			<CalendarRange
				ref={ref}
				rangeStart={new Date(2025, 5, 1)}
				rangeEnd={rangeEnd}
				onHoverDate={onHoverDate}
			/>
		)

		const { rerender } = renderUI(june(null))

		const first = enterOfJuneFifth()

		expect(first).toBeTypeOf('function')

		// Day 5 moves into the band and renders again. While June shows, its
		// handler keeps its identity.
		rerender(june(new Date(2025, 5, 10)))

		expect(enterOfJuneFifth()).toBe(first)

		act(() => ref.current?.nextMonth())

		act(() => ref.current?.prevMonth())

		// The cache keys each handler on the `Date` of its cell, not on the day
		// number. A revisited month has new `Date`s, so it takes new handlers.
		expect(enterOfJuneFifth()).not.toBe(first)
	})
})
