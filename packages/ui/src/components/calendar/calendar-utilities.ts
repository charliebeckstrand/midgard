import {
	CalendarDate,
	endOfMonth,
	getDayOfWeek,
	isSameDay as isSameCalendarDay,
	startOfWeek,
} from '@internationalized/date'

/**
 * Converts a native `Date` to a timezone-free `CalendarDate` using its local
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

/** Coalesces an optional locale to a concrete BCP 47 tag, falling back to the
 *  runtime default. The lib's locale-aware helpers require a string. */
export function resolveLocale(locale?: string): string {
	return locale ?? new Intl.DateTimeFormat().resolvedOptions().locale
}

/**
 * 1-based grid column of the 1st of `year`/`month`, honoring the locale's
 * first day of the week (Sunday in `en-US`, Monday in most of Europe).
 */
export function getFirstDayColumn(year: number, month: number, locale: string): number {
	return getDayOfWeek(new CalendarDate(year, month + 1, 1), locale) + 1
}

// A fixed reference week (starting Sunday 2021-01-03) makes the label output
// depend only on the locale, never on the current date; output stays
// deterministic across server and client renders.
const WEEKDAY_REFERENCE = new CalendarDate(2021, 1, 3)

/** Short weekday labels ordered by the locale's first day of the week. */
export function getWeekdayLabels(locale: string): string[] {
	const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' })

	const start = startOfWeek(WEEKDAY_REFERENCE, locale)

	return Array.from({ length: 7 }, (_, index) =>
		formatter.format(fromCalendarDate(start.add({ days: index }))),
	)
}

/** Short month labels (January through December) for the locale. */
export function getMonthLabels(locale: string): string[] {
	const formatter = new Intl.DateTimeFormat(locale, { month: 'short' })

	return Array.from({ length: 12 }, (_, index) => formatter.format(new Date(2021, index, 1)))
}
