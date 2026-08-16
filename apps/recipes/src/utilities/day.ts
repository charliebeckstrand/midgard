/**
 * Days, as the app records them.
 *
 * A plan day and a cook day are both `YYYY-MM-DD` read against the machine's own
 * clock, because that is what the reader means by a day: the meal was on
 * Tuesday, not at an instant that is Tuesday in one zone and Monday in another.
 * Every conversion in the app goes through this pair, so the two edges cannot
 * disagree about which day it is.
 */

/** The `YYYY-MM-DD` day a Date falls on, read in local time. */
export function toDay(date: Date): string {
	const year = date.getFullYear()

	const month = String(date.getMonth() + 1).padStart(2, '0')

	const day = String(date.getDate()).padStart(2, '0')

	return `${year}-${month}-${day}`
}

/** Reads a stored `YYYY-MM-DD` day back as a local midnight, for display and for arithmetic. */
export function fromDay(day: string): Date {
	const [year, month, date] = day.split('-').map(Number)

	return new Date(year ?? 1970, (month ?? 1) - 1, date ?? 1)
}

/** Today, as a day. */
export function today(): string {
	return toDay(new Date())
}

/**
 * A day moved by whole days.
 *
 * Built through `fromDay`, so a step across a daylight-saving boundary still
 * lands on the next calendar day rather than 23 or 25 hours later.
 */
export function addDays(day: string, days: number): string {
	const date = fromDay(day)

	date.setDate(date.getDate() + days)

	return toDay(date)
}

/**
 * A day written the way a reader reads one.
 *
 * The locale is the runtime's, which is the same one the calendar draws its
 * month and weekday names in.
 */
export function dayLabel(day: string, options: Intl.DateTimeFormatOptions): string {
	return fromDay(day).toLocaleDateString(undefined, options)
}
