import { CalendarDate, endOfMonth, isSameDay as isSameCalendarDay } from '@internationalized/date'

/**
 * Convert a native `Date` to a timezone-free `CalendarDate` using its local
 * year/month/day. This mirrors the wall-clock-day semantics the calendar uses
 * everywhere (`getFullYear`/`getMonth`/`getDate`) and sidesteps the DST and
 * timezone pitfalls of comparing `Date` instances by their millisecond value.
 */
export function toCalendarDate(date: Date): CalendarDate {
	return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

/** Inverse of `toCalendarDate`: a local-midnight `Date` for the calendar day. */
export function fromCalendarDate(date: CalendarDate): Date {
	return new Date(date.year, date.month - 1, date.day)
}

export function isSameDay(a: Date, b: Date): boolean {
	return isSameCalendarDay(toCalendarDate(a), toCalendarDate(b))
}

export function isBeforeDay(a: Date, b: Date): boolean {
	return toCalendarDate(a).compare(toCalendarDate(b)) < 0
}

export function isBetween(date: Date, start: Date, end: Date): boolean {
	const [lo, hi] = isBeforeDay(start, end) ? [start, end] : [end, start]

	return isBeforeDay(lo, date) && isBeforeDay(date, hi)
}

export function getCalendarDays(year: number, month: number): Date[] {
	const daysInMonth = endOfMonth(new CalendarDate(year, month + 1, 1)).day

	const days: Date[] = []

	for (let day = 1; day <= daysInMonth; day++) {
		days.push(new Date(year, month, day))
	}

	return days
}
