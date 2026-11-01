import { type RefObject, useCallback } from 'react'
import type { CalendarHandle } from '../calendar'
import { clampDate } from './date-picker-utilities'

/**
 * The two seeds of the grid highlight. `getViewEntryDate` starts the arrow keys
 * on the entry day of the calendar (`CalendarHandle.getEntryDate`). That day is
 * in the month that the calendar shows, which header paging can move away from
 * `anchor`. It is `null` when that month holds no enabled day.
 * `getInitialActiveDate` gives `anchor`, else today, and `min` and `max` bound
 * it. It starts Enter and Space with no highlight, and the Page keys from the
 * header, the footer, or no highlight. With no highlight, it also starts the
 * arrow keys when the entry day is `null`. With no calendar mounted,
 * `getViewEntryDate` gives the same day.
 *
 * @param anchor - The selected day: the value, or the start of a range in progress.
 * @internal
 */
export function useDatePickerGridEntry(
	anchor: Date | null | undefined,
	min: Date | undefined,
	max: Date | undefined,
	calendarRef: RefObject<CalendarHandle | null>,
) {
	const getInitialActiveDate = useCallback(
		() => clampDate(anchor ?? new Date(), min, max),
		[anchor, min, max],
	)

	const getViewEntryDate = useCallback(() => {
		const calendar = calendarRef.current

		return calendar ? calendar.getEntryDate() : getInitialActiveDate()
	}, [calendarRef, getInitialActiveDate])

	return { getInitialActiveDate, getViewEntryDate }
}
