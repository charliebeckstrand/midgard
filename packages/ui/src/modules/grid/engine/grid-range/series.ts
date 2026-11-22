/**
 * The series of a fill other than numbers: dates that step by days or by
 * months, and text that ends in a whole number. Each reader returns the next
 * values of a source line, or `null` when the line is not such a series. A
 * line that is no series repeats (see `fillLine`).
 */

/** A date as `YYYY-MM-DD`, with no time and no zone. */
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/

/** The milliseconds of a day of the calendar. */
const DAY_MS = 86_400_000

/**
 * A date of the calendar, and the time of day of a `Date` as the clock reads
 * it: the hours, the minutes, the seconds, and the milliseconds. A count of
 * milliseconds from midnight would move the clock on a day that changes to or
 * from daylight saving time, which is not 24 hours long.
 */
type CalendarDay = { year: number; month: number; day: number; time: readonly number[] }

/**
 * The UTC milliseconds of midnight of a day, as `Date.UTC` gives them for each
 * year. `Date.UTC` and the `Date` constructor read a year from 0 to 99 as 1900
 * to 1999, and `setUTCFullYear` reads it as it is.
 */
function utcDay(year: number, month: number, day: number): number {
	const date = new Date(0)

	date.setUTCFullYear(year, month, day)

	return date.getTime()
}

/** The days of a month, `month` from 0. */
function daysInMonth(year: number, month: number): number {
	return new Date(utcDay(year, month + 1, 0)).getUTCDate()
}

/**
 * A source value as a day of the calendar: a valid `Date` in the local zone, or
 * a valid `YYYY-MM-DD` string. `null` for any other value.
 */
function readDay(value: unknown, iso: boolean): CalendarDay | null {
	if (!iso) {
		if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null

		return {
			year: value.getFullYear(),
			month: value.getMonth(),
			day: value.getDate(),
			time: [value.getHours(), value.getMinutes(), value.getSeconds(), value.getMilliseconds()],
		}
	}

	const match = typeof value === 'string' ? ISO_DAY.exec(value) : null

	if (!match) return null

	const [, year = '', month = '', day = ''] = match

	const parsed = { year: Number(year), month: Number(month) - 1, day: Number(day), time: [] }

	const valid =
		parsed.month >= 0 &&
		parsed.month <= 11 &&
		parsed.day >= 1 &&
		parsed.day <= daysInMonth(parsed.year, parsed.month)

	return valid ? parsed : null
}

/** A day of the calendar as the type of its source: a local `Date`, or a `YYYY-MM-DD` string. */
function writeDay({ year, month, day, time }: CalendarDay, iso: boolean): unknown {
	if (!iso) {
		const [hours = 0, minutes = 0, seconds = 0, ms = 0] = time

		// `setFullYear`, not the constructor, which reads a year from 0 to 99 as
		// 1900 to 1999 (see `utcDay`).
		const date = new Date(0)

		date.setFullYear(year, month, day)

		date.setHours(hours, minutes, seconds, ms)

		return date
	}

	const pad = (value: number, width: number) => String(value).padStart(width, '0')

	return `${pad(year, 4)}-${pad(month + 1, 2)}-${pad(day, 2)}`
}

/** The constant gap of a list of numbers, or `null` when the gaps differ. */
function constantGap(values: readonly number[]): number | null {
	const gap = (values[1] as number) - (values[0] as number)

	for (let i = 2; i < values.length; i++) {
		if ((values[i] as number) - (values[i - 1] as number) !== gap) return null
	}

	return gap
}

/**
 * The next days of a month series: each day on the day of the month of the
 * first, or on the last day of a shorter month, as Jan 31 then Feb 28 does.
 * `null` when the days do not keep the day of the month or a constant step of
 * months.
 */
function monthSeries(days: readonly CalendarDay[], count: number): CalendarDay[] | null {
	const anchor = (days[0] as CalendarDay).day

	const onAnchor = days.every(({ year, month, day }) => {
		return day === Math.min(anchor, daysInMonth(year, month))
	})

	const step = onAnchor ? constantGap(days.map(({ year, month }) => year * 12 + month)) : null

	if (!step) return null

	const last = days.at(-1) as CalendarDay

	const start = last.year * 12 + last.month

	return Array.from({ length: count }, (_, index) => {
		const months = start + step * (index + 1)

		const year = Math.floor(months / 12)

		const month = months - year * 12

		return { year, month, day: Math.min(anchor, daysInMonth(year, month)), time: last.time }
	})
}

/**
 * The next days of a series of whole days, such as a week of 7. The step counts
 * days of the calendar, so a change of daylight saving time moves no date.
 */
function daySeries(days: readonly CalendarDay[], count: number): CalendarDay[] | null {
	const numbers = days.map(({ year, month, day }) => utcDay(year, month, day) / DAY_MS)

	const step = constantGap(numbers)

	if (!step) return null

	const last = numbers.at(-1) as number

	const { time } = days.at(-1) as CalendarDay

	return Array.from({ length: count }, (_, index) => {
		const date = new Date((last + step * (index + 1)) * DAY_MS)

		return { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate(), time }
	})
}

/**
 * The next `count` values of a line of dates: all `Date` values, or all
 * `YYYY-MM-DD` strings, two or more, with one time of day. A line of whole
 * months, as each day of the same date of the month, steps by months. Twelve
 * months make a year. Another line with a constant step of days steps by days.
 * Each value has the type of its source. `null` for a line that is no such
 * series.
 *
 * @internal
 */
export function dateSeries(line: readonly unknown[], count: number): unknown[] | null {
	if (line.length < 2) return null

	const iso = typeof line[0] === 'string'

	const days = line.map((value) => readDay(value, iso))

	if (days.some((day) => day === null)) return null

	const read = days as CalendarDay[]

	const clock = (read[0] as CalendarDay).time.join()

	if (read.some(({ time }) => time.join() !== clock)) return null

	const next = monthSeries(read, count) ?? daySeries(read, count)

	return next?.map((day) => writeDay(day, iso)) ?? null
}

/** Text that ends in a whole number: the text before it, and its digits. */
const TRAILING_NUMBER = /^(.*?)(\d{1,15})$/s

/**
 * The next `count` values of a line of text that ends in a whole number, two
 * or more, such as `Item 1, Item 2`. Each value has the same text before the
 * number, and the numbers have a constant step. A source number with a leading
 * zero, such as `Q01`, keeps the width of the widest source number. `null` for
 * a line that is no such series, for a series that would go below zero, and
 * for a value in the shape of `YYYY-MM-DD`, which is a date (see
 * {@link dateSeries}).
 *
 * @internal
 */
export function textSeries(line: readonly unknown[], count: number): unknown[] | null {
	if (line.length < 2) return null

	// A value in the shape of a date is a date, also when it is not a valid
	// day, so `2026-02-28, 2026-02-29` repeats and does not count on to `-30`.
	const parts = line.map((value) =>
		typeof value === 'string' && !ISO_DAY.test(value) ? TRAILING_NUMBER.exec(value) : null,
	)

	const prefix = parts[0]?.[1]

	if (prefix === undefined || parts.some((match) => match?.[1] !== prefix)) return null

	const digits = parts.map((match) => match?.[2] ?? '')

	const step = constantGap(digits.map(Number))

	const last = Number(digits.at(-1))

	if (!step || last + step * count < 0) return null

	const padded = digits.some((value) => value.length > 1 && value.startsWith('0'))

	const width = padded ? Math.max(...digits.map((value) => value.length)) : 0

	return Array.from(
		{ length: count },
		(_, index) => `${prefix}${String(last + step * (index + 1)).padStart(width, '0')}`,
	)
}
