import { endOfMonth as calendarEndOfMonth, DateFormatter } from '@internationalized/date'
import { resolveLocale } from '../../utilities'
import { fromCalendarDate, isYearInRange, toCalendarDate } from '../calendar/calendar-utilities'

/**
 * Trigger label for a single date, in `locale`. That is the ambient
 * `<LocaleProvider>` tag at every call site. The trigger therefore reads the
 * same locale as the calendar beside it, not the runtime default.
 *
 * The calendar is always Gregorian, as in the grid. A locale such as `th-TH`
 * or `fa-IR` defaults to another calendar, and its year then disagrees with
 * the grid.
 *
 * @internal
 */
export function formatDate(
	date: Date,
	locale?: string,
	options?: Intl.DateTimeFormatOptions,
): string {
	return dateFormatter(locale, options).format(date)
}

/**
 * Trigger label for a range, in the range form of `locale`. The locale sets the
 * separator and drops the fields that both endpoints share, as in "Jan 1 – 10,
 * 2024". A range of one day gives the label of that one date.
 *
 * @internal
 */
export function formatRange(
	start: Date,
	end: Date,
	locale?: string,
	options?: Intl.DateTimeFormatOptions,
): string {
	return dateFormatter(locale, options).formatRange(start, end)
}

/** Gregorian formatter for `locale`, shared by the single and range labels. */
function dateFormatter(locale?: string, options?: Intl.DateTimeFormatOptions): DateFormatter {
	return new DateFormatter(resolveLocale(locale), { ...options, calendar: 'gregory' })
}

/** Local midnight for a date, dropping the time of day. @internal */
export function startOfDay(date: Date): Date {
	return fromCalendarDate(toCalendarDate(date))
}

/** Date shifted by `amount` calendar days (negative goes back). @internal */
export function addDays(date: Date, amount: number): Date {
	return fromCalendarDate(toCalendarDate(date).add({ days: amount }))
}

/**
 * Date shifted by `amount` months, clamping day-of-month to the target month's
 * length (Jan 31 + 1 month → Feb 28/29).
 *
 * @internal
 */
export function addMonths(date: Date, amount: number): Date {
	return fromCalendarDate(toCalendarDate(date).add({ months: amount }))
}

/**
 * Date moved by `step` days or months, as {@link addDays} and {@link addMonths}
 * move it. A step that leaves years 1 to 9999 gives `date` itself, so a move at
 * a limit stays put, as the Calendar grid does. Without the check, a step back
 * from 1 January 0001 goes to December 0001.
 *
 * @internal
 */
export function stepDate(date: Date, step: { days: number } | { months: number }): Date {
	if ('days' in step) {
		// A native `Date` holds every year, so it shows the target year before the
		// library clamps it.
		const target = new Date(date)

		target.setDate(target.getDate() + step.days)

		return isYearInRange(target.getFullYear()) ? addDays(date, step.days) : date
	}

	const year = Math.floor((date.getFullYear() * 12 + date.getMonth() + step.months) / 12)

	return isYearInRange(year) ? addMonths(date, step.months) : date
}

/** Date confined to the inclusive `min`/`max` bounds (day resolution). @internal */
export function clampDate(date: Date, min?: Date, max?: Date): Date {
	let value = toCalendarDate(date)

	if (min && value.compare(toCalendarDate(min)) < 0) value = toCalendarDate(min)

	if (max && value.compare(toCalendarDate(max)) > 0) value = toCalendarDate(max)

	return fromCalendarDate(value)
}

/** Local-midnight first day of `date`'s month. @internal */
export function startOfMonth(date: Date): Date {
	return fromCalendarDate(toCalendarDate(date).set({ day: 1 }))
}

/** Local-midnight last day of `date`'s month (28–31). @internal */
export function endOfMonth(date: Date): Date {
	return fromCalendarDate(calendarEndOfMonth(toCalendarDate(date)))
}

/** Local-midnight January 1st of `date`'s year. @internal */
export function startOfYear(date: Date): Date {
	return fromCalendarDate(toCalendarDate(date).set({ month: 1, day: 1 }))
}

/** Local-midnight December 31st of `date`'s year. @internal */
export function endOfYear(date: Date): Date {
	return fromCalendarDate(toCalendarDate(date).set({ month: 12, day: 31 }))
}
