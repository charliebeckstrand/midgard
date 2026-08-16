import {
	CalendarDate,
	endOfMonth,
	getDayOfWeek,
	getLocalTimeZone,
	isSameDay as isSameCalendarDay,
	startOfWeek,
} from '@internationalized/date'

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

/**
 * Inverse of `toCalendarDate`: a local-midnight `Date` for the calendar day.
 * Conversion goes through `@internationalized/date`, not the
 * `Date(year, month, day)` constructor. The constructor reads years 0–99 as
 * 1900–1999 (`0001-01-01` → `1901-01-01`).
 *
 * @internal
 */
export function fromCalendarDate(date: CalendarDate): Date {
	return date.toDate(getLocalTimeZone())
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

/** Wall-clock-day equality, ignoring time-of-day and timezone. @internal */
export function isSameDay(a: Date, b: Date): boolean {
	return isSameCalendarDay(toCalendarDate(a), toCalendarDate(b))
}

/** True when `a`'s calendar day strictly precedes `b`'s. @internal */
export function isBeforeDay(a: Date, b: Date): boolean {
	return toCalendarDate(a).compare(toCalendarDate(b)) < 0
}

/** True when `date` falls strictly between the endpoints (exclusive); endpoints may be given in either order. @internal */
export function isBetween(date: Date, start: Date, end: Date): boolean {
	const [lo, hi] = isBeforeDay(start, end) ? [start, end] : [end, start]

	return isBeforeDay(lo, date) && isBeforeDay(date, hi)
}

/** Local-midnight `Date` for every day of `year`/`month` (0-based month), in order. @internal */
export function getCalendarDays(year: number, month: number): Date[] {
	const first = new CalendarDate(year, month + 1, 1)

	const daysInMonth = endOfMonth(first).day

	const days: Date[] = []

	for (let day = 1; day <= daysInMonth; day++) {
		days.push(fromCalendarDate(first.set({ day })))
	}

	return days
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
	const formatter = new Intl.DateTimeFormat(locale, { month: 'short' })

	// Same fixed-reference rule as the weekday labels, through the file's own
	// month helper: output depends on the locale, never on the current date.
	return Array.from({ length: 12 }, (_, index) => formatter.format(firstOfMonth(2021, index)))
}

/** A day's own key, as `YYYY-M-D`. Cheaper than an ISO stamp, and a month never repeats one. */
function dayKey(date: Date): string {
	return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

/** One cell of a `month`-layout week: a day, or the padding at either end of the month. */
export type CalendarCell = {
	date: Date | null
	/** Stable identity for the render, so a padding cell is not keyed by where it sits. */
	key: string
}

/**
 * A month's days chunked into weeks, padded to seven cells each.
 *
 * The `picker` layout lays every day out in one flat grid and offsets the 1st
 * into its column, which needs no rows at all. The `month` layout does need
 * them: once a cell holds more than a date it is a `gridcell`, and a `gridcell`
 * has to sit in a `row`.
 *
 * A padding cell is `null` rather than a date from the neighbouring month. The
 * month grid draws one month, and a cell holding a day the reader cannot act on
 * is a cell they will try to act on.
 *
 * @param days The month's days, in order — what `getCalendarDays` returns.
 * @param firstDayColumn The 1-based column the 1st falls in, per the locale's
 *   first day of the week — what `getFirstDayColumn` returns.
 */
export function toWeeks(days: readonly Date[], firstDayColumn: number): CalendarCell[][] {
	const lead = Math.max(0, firstDayColumn - 1)

	const cells: CalendarCell[] = [
		// A padding cell carries its own key rather than borrowing its position,
		// because a position is not an identity: the row it sits in is the thing
		// React would otherwise rebuild whenever the month changed shape.
		...Array.from({ length: lead }, (_unused, at) => ({ date: null, key: `lead:${at}` })),
		...days.map((date) => ({ date, key: dayKey(date) })),
	]

	// The last week is padded out too, so every row holds seven cells and the
	// week keeps its shape.
	for (let at = 0; cells.length % 7 !== 0; at++) cells.push({ date: null, key: `tail:${at}` })

	const weeks: CalendarCell[][] = []

	for (let at = 0; at < cells.length; at += 7) weeks.push(cells.slice(at, at + 7))

	return weeks
}
