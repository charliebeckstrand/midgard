import { CATALOG_LOCALES } from '../primitives/intl/intl-language'

/**
 * An instant and the text that a server wrote for it, such as
 * `{ at: '2026-11-04T01:00:00.000Z', text: 'Nov 3, 2026, 7:00 PM CST' }`.
 * Give it to `DateTime` as its `value`, and the browser shows the text of the
 * server in each render.
 *
 * @see {@link formatDateText}
 */
export type DateText = {
	/** The instant, as an ISO string. For a span, the start of the span. */
	at: string
	/** The text that the server wrote. */
	text: string
}

/** An instant that {@link formatDateText} reads: a `Date`, an ISO string, or a timestamp in milliseconds. */
type DateValue = Date | string | number

/** Options that name a time zone, because a server does not know the zone of the reader. */
type ZonedDateOptions = Intl.DateTimeFormatOptions & { timeZone: string }

/** Whether `value` is a span: a pair of instants. */
function isSpan(
	value: DateValue | readonly [DateValue, DateValue],
): value is readonly [DateValue, DateValue] {
	return Array.isArray(value)
}

/**
 * Writes the text of a date on the server, so that the first paint shows the
 * date and the browser does not write it again.
 *
 * The text of `Intl` comes from the date data of the JavaScript engine, and
 * two engines can write different text for one format, such as Node on the
 * server and Safari in the browser. If the browser writes the text again in
 * the hydration render, the text can differ from the HTML of the server, and
 * React then renders the tree again from the start. Thus a date that the first
 * paint must show is written one time, here, and the page passes the text.
 *
 * @param value - The instant, or a span as a pair of instants. A span gets the
 * text of `formatRange`, which leaves out what the two instants share, such as
 * `Oct 4 – 9, 2026`.
 * @param format - `Intl.DateTimeFormat` options with a `timeZone`.
 * @param locale - The locale of the text. The default is the source locale of
 * the catalogs of ui.
 * @returns The {@link DateText}, or `null` when an instant does not parse.
 * @example
 * ```ts
 * formatDateText(race.polls_close, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Chicago' })
 * ```
 */
export function formatDateText(
	value: DateValue | readonly [DateValue, DateValue],
	format: ZonedDateOptions,
	locale: string = CATALOG_LOCALES[0],
): DateText | null {
	const [from, to]: readonly [DateValue, DateValue?] = isSpan(value) ? value : [value]

	const start = new Date(from)

	const end = to === undefined ? undefined : new Date(to)

	if (Number.isNaN(start.getTime()) || (end !== undefined && Number.isNaN(end.getTime()))) {
		return null
	}

	const formatter = new Intl.DateTimeFormat(locale, format)

	return {
		at: start.toISOString(),
		text: end === undefined ? formatter.format(start) : formatter.formatRange(start, end),
	}
}
