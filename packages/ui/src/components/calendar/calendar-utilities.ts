import {
	CalendarDate,
	endOfMonth,
	GregorianCalendar,
	getDayOfWeek,
	parseDate,
	startOfWeek,
	toCalendar,
} from '@internationalized/date'
import { getOrCompute } from '../../utilities'

/**
 * The first year that the calendar can show. `@internationalized/date` holds
 * years 1 to 9999, and a `CalendarDate` clamps a year outside them.
 *
 * @internal
 */
export const MIN_YEAR = 1

/** The last year that the calendar can show. See {@link MIN_YEAR}. @internal */
export const MAX_YEAR = 9999

/** Whether the calendar can show `year`. @internal */
export function isYearInRange(year: number): boolean {
	return year >= MIN_YEAR && year <= MAX_YEAR
}

/**
 * Converts a native `Date` to a timezone-free `CalendarDate` using its local
 * year/month/day. This mirrors the wall-clock-day semantics the calendar uses
 * everywhere (`getFullYear`/`getMonth`/`getDate`) and sidesteps the DST and
 * timezone pitfalls of comparing `Date` instances by their millisecond value.
 *
 * @internal
 */
export function toCalendarDate(date: Date): CalendarDate {
	return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

// The Gregorian calendar that `fromCalendarDate` reads each day in.
const GREGORIAN_CALENDAR = new GregorianCalendar()

/**
 * Inverse of `toCalendarDate`: a local-midnight `Date` for the calendar day.
 * Local midnight is in the runtime zone, which the local getters of `Date`
 * read. The zone of `@internationalized/date` can differ: an app can set it
 * with `setLocalTimeZone`, and the library keeps the zone of its first read.
 * `setFullYear` sets the day, because the `Date(year, month, day)` constructor
 * reads years 0–99 as 1900–1999 (`0001-01-01` → `1901-01-01`).
 *
 * @internal
 */
export function fromCalendarDate(date: CalendarDate): Date {
	const { era, year, month, day } = toCalendar(date, GREGORIAN_CALENDAR)

	const local = new Date(0)

	local.setFullYear(era === 'BC' ? 1 - year : year, month - 1, day)

	local.setHours(0, 0, 0, 0)

	return local
}

/**
 * Selector for a day cell. The `data-date` attribute of the cell holds the key
 * of its day ({@link dayKey}).
 *
 * @internal
 */
export const DAY_KEY_SELECTOR = '[data-date]'

/**
 * The key of the day of `date`: the ISO date (`YYYY-MM-DD`) of its local day.
 * A day cell holds it in its `data-date` attribute. {@link dayOfKey} reads it.
 *
 * @internal
 */
export function dayKey(date: Date): string {
	return toCalendarDate(date).toString()
}

/** The local-midnight `Date` of a key that {@link dayKey} gives. @internal */
export function dayOfKey(key: string): Date {
	return fromCalendarDate(parseDate(key))
}

/**
 * Local-midnight `Date` for the first of `year`/`month` (0-based month).
 * Out-of-range months balance into adjacent years (month 12 → January of the
 * next year). This matches `Date` constructor rollover without its
 * two-digit-year mapping.
 *
 * @internal
 */
export function firstOfMonth(year: number, month: number): Date {
	return fromCalendarDate(new CalendarDate(year, 1, 1).add({ months: month }))
}

/**
 * The wall-clock day of `date` as one sortable number, from its local year,
 * month, and day. Two dates compare by this number as their calendar days do,
 * whatever the time of day. The grid compares several times for each day cell
 * on each render, so the compare builds no `CalendarDate`.
 *
 * @internal
 */
function dayNumber(date: Date): number {
	return date.getFullYear() * 10_000 + date.getMonth() * 100 + date.getDate()
}

/** Wall-clock-day equality, ignoring time-of-day and timezone. @internal */
export function isSameDay(a: Date, b: Date): boolean {
	return dayNumber(a) === dayNumber(b)
}

/** Whether two values hold the same instant, or are both empty. @internal */
export function isSameInstant(a: Date | null | undefined, b: Date | null | undefined): boolean {
	if (a == null || b == null) return a == null && b == null

	return a.getTime() === b.getTime()
}

/** True when `a`'s calendar day strictly precedes `b`'s. @internal */
export function isBeforeDay(a: Date, b: Date): boolean {
	return dayNumber(a) < dayNumber(b)
}

/** True when the calendar day of `date` is on or after `min` and on or before `max`; the time of day on each bound has no effect. @internal */
export function isDayInRange(date: Date, min?: Date, max?: Date): boolean {
	return !(min && isBeforeDay(date, min)) && !(max && isBeforeDay(max, date))
}

/** True when `date` falls strictly between the endpoints (exclusive); the caller can give the endpoints in either order. @internal */
export function isBetween(date: Date, start: Date, end: Date): boolean {
	const [lo, hi] = isBeforeDay(start, end) ? [start, end] : [end, start]

	return isBeforeDay(lo, date) && isBeforeDay(date, hi)
}

/** Local-midnight `Date` for every day of `year`/`month` (0-based month), in order. @internal */
export function getCalendarDays(year: number, month: number): Date[] {
	const first = new CalendarDate(year, month + 1, 1)

	const daysInMonth = endOfMonth(first).day

	return Array.from({ length: daysInMonth }, (_, i) => fromCalendarDate(first.set({ day: i + 1 })))
}

/**
 * 1-based grid column of the 1st of `year`/`month`, honoring the locale's
 * first day of the week (Sunday in `en-US`, Monday in most of Europe).
 *
 * @internal
 */
export function getFirstDayColumn(year: number, month: number, locale: string): number {
	return getDayOfWeek(new CalendarDate(year, month + 1, 1), locale) + 1
}

// A fixed reference week (starting Sunday 2021-01-03) makes the label output
// depend only on the locale, never on the current date; output stays
// deterministic across server and client renders.
const WEEKDAY_REFERENCE = new CalendarDate(2021, 1, 3)

// The grid is Gregorian, so each label names a Gregorian month and year. A
// locale such as `th-TH` or `fa-IR` defaults to another calendar, and its
// labels then name a month that the grid does not show.
const GREGORIAN = { calendar: 'gregory' } as const

// A new `Intl.DateTimeFormat` for each day cell is measurable on each month
// change, so the day-name formatter is cached by locale.
const dayNameFormatters = new Map<string, Intl.DateTimeFormat>()

/** Accessible name of a day in `locale`, such as "Sunday, June 15, 2025". @internal */
export function formatDayName(date: Date, locale: string): string {
	const formatter = getOrCompute(
		dayNameFormatters,
		locale,
		() =>
			new Intl.DateTimeFormat(locale, {
				...GREGORIAN,
				weekday: 'long',
				day: 'numeric',
				month: 'long',
				year: 'numeric',
			}),
	)

	return formatter.format(date)
}

/** Name of the month of `date` with its year in `locale`, such as "June 2025". @internal */
export function formatMonthName(date: Date, locale: string): string {
	return date.toLocaleDateString(locale, { ...GREGORIAN, month: 'long', year: 'numeric' })
}

/** Short weekday labels ordered by the locale's first day of the week. */
export function getWeekdayLabels(locale: string): string[] {
	const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' })

	const start = startOfWeek(WEEKDAY_REFERENCE, locale)

	return Array.from({ length: 7 }, (_, index) =>
		formatter.format(fromCalendarDate(start.add({ days: index }))),
	)
}

/** Short month labels (Jan through Dec), in calendar order, for the locale. */
export function getMonthLabels(locale: string): string[] {
	const formatter = new Intl.DateTimeFormat(locale, { ...GREGORIAN, month: 'short' })

	// Same fixed-reference rule as the weekday labels, through the file's own
	// month helper: output depends on the locale, never on the current date.
	return Array.from({ length: 12 }, (_, index) => formatter.format(firstOfMonth(2021, index)))
}
