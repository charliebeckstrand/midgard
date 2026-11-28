import { CalendarDate, parseDate } from '@internationalized/date'

/**
 * The ISO date (`YYYY-MM-DD`) of the local day of `date`. A day key in this
 * form sorts as text in the order of the days, and a URL or a `Set` can hold it.
 *
 * @remarks It reads the local parts of `date`, so the key is the day that the
 * reader sees, not the UTC day. The year has four digits, also below 1000.
 *
 * An ISO date in this form holds the years 1 to 9999. A `CalendarDate` clamps a
 * year outside them, so two days would share one key. Thus a year outside them
 * throws.
 * @param date - The day to read.
 * @returns The ISO date of the day.
 * @throws A `RangeError` when the year of `date` is not in 1 to 9999, or
 * `date` is not a valid date.
 * @example
 *   toIsoDay(new Date(2026, 10, 3)) // '2026-11-03'
 */
export function toIsoDay(date: Date): string {
	const year = date.getFullYear()

	if (!(year >= 1 && year <= 9999)) throw new RangeError(`No ISO day for the year ${year}`)

	return new CalendarDate(year, date.getMonth() + 1, date.getDate()).toString()
}

/**
 * The local midnight of the day of an ISO date. It is the inverse of
 * {@link toIsoDay}.
 *
 * @remarks `setFullYear` sets the day, because the `Date(year, month, day)`
 * constructor reads the years 0 to 99 as 1900 to 1999.
 * @param iso - An ISO date, `YYYY-MM-DD`.
 * @returns The local-midnight `Date` of the day.
 * @throws When `iso` is not a valid ISO date.
 */
export function fromIsoDay(iso: string): Date {
	const { year, month, day } = parseDate(iso)

	const local = new Date(0)

	local.setFullYear(year, month - 1, day)

	local.setHours(0, 0, 0, 0)

	return local
}
