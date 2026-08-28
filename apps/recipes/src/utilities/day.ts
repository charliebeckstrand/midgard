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

/** The formatters built so far, one per options shape. */
const formatters = new Map<string, Intl.DateTimeFormat>()

/**
 * The cached `Intl.DateTimeFormat` for an options shape, built once on first use.
 *
 * Sorted-key serialisation, so two equivalent options objects written in a
 * different order share one instance.
 */
function formatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
	const key = JSON.stringify(options, Object.keys(options).sort())

	let held = formatters.get(key)

	if (held === undefined) {
		held = new Intl.DateTimeFormat(undefined, options)

		formatters.set(key, held)
	}

	return held
}

/**
 * A day written the way a reader reads one.
 *
 * The locale is the runtime's, which is the same one the calendar draws its
 * month and weekday names in.
 *
 * The formatter is cached, because this is called far more often than it looks:
 * four times per column on the board, and once per row of the list on every
 * keystroke in the search box — the filter lives in the address, so each
 * keypress re-renders the whole list. `Intl.DateTimeFormat` has no cache of its
 * own, which is the same reason `resolveLocale` in `ui` resolves once.
 */
export function dayLabel(day: string, options: Intl.DateTimeFormatOptions): string {
	return formatter(options).format(fromDay(day))
}
