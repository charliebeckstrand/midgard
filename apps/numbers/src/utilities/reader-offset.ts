/*
 * The offset of the time zone of the reader. The browser writes it in a cookie,
 * so the server knows the day of the reader, and renders the stats of the daily
 * puzzle of today in the first paint (CONVENTIONS §3.13).
 */

/** The cookie that holds the offset of the time zone of the reader, in minutes behind UTC (`getTimezoneOffset`). */
export const OFFSET_COOKIE = 'numbers-utc-offset'

/** The largest offset of a time zone from UTC, in minutes: UTC-12 to UTC+14 fit in it. */
const MAX_OFFSET = 14 * 60

/** An offset in the cookie: a whole number of minutes. */
const OFFSET_PATTERN = /^-?\d{1,3}$/

/** Gives the offset of the cookie value `value`, or `null` when there is no cookie, or when its value is not an offset. */
export function parseOffset(value: string | undefined): number | null {
	if (value === undefined || !OFFSET_PATTERN.test(value)) return null

	const offset = Number(value)

	return Math.abs(offset) <= MAX_OFFSET ? offset : null
}
