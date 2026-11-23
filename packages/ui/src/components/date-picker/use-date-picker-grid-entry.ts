import { type RefObject, useCallback, useMemo } from 'react'
import type { CalendarHandle } from '../calendar'
import { dayOptionId } from '../calendar/calendar-utilities'
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

/**
 * The day button that gets DOM focus when the dialog opens, as a ref. It is
 * the entry day of the calendar (`CalendarHandle.getEntryDate`): the selected
 * day, else today, else the first enabled day of the shown month. The ref
 * reads the day when the focus manager reads `current`, after the dialog
 * mounts, so the day is the day of the open. It finds the button by the id that
 * the grid gives each day from `listboxId`.
 *
 * @param listboxId - The id that the picker gives the day listbox.
 * @returns A ref whose `current` is the day button, or `null` when the shown
 * month holds no enabled day. The focus manager then focuses its default.
 * @internal
 */
export function useDatePickerGridEntryFocus(
	listboxId: string,
	calendarRef: RefObject<CalendarHandle | null>,
): RefObject<HTMLElement | null> {
	return useMemo(() => entryFocusRef(listboxId, calendarRef), [listboxId, calendarRef])
}

// The React Compiler does not compile an object getter in a hook, so the getter
// is in this plain function.
function entryFocusRef(
	listboxId: string,
	calendarRef: RefObject<CalendarHandle | null>,
): RefObject<HTMLElement | null> {
	return {
		get current() {
			const date = calendarRef.current?.getEntryDate()

			return date ? document.getElementById(dayOptionId(listboxId, date)) : null
		},
	}
}
