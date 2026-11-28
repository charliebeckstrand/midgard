import { CalendarDate, parseDate } from '@internationalized/date'

/**
 * The ISO date (`YYYY-MM-DD`) of the local day of `date`. A day key in this
 * form sorts as text in the order of the days, and a URL or a `Set` can hold it.
 *
 * @remarks It reads the local parts of `date`, so the key is the day that the
 * reader sees, not the UTC day. The year has four digits, also below 1000.
 * @param date - The day to read.
 * @returns The ISO date of the day.
 * @example
 *   toIsoDay(new Date(2026, 10, 3)) // '2026-11-03'
 */
export function toIsoDay(date: Date): string {
	return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate()).toString()
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
