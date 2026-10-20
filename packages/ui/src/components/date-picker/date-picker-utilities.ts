import {
	endOfMonth as calendarEndOfMonth,
	type DateDuration,
	DateFormatter,
} from '@internationalized/date'
import { resolveLocale } from '../../utilities'
import { clampDay, fromCalendarDate, stepDay, toCalendarDate } from '../calendar/calendar-utilities'

/**
 * Trigger label for a single date, in `locale`. That is the ambient
 * `<LocaleProvider>` tag at every call site. The trigger therefore reads the
 * same locale as the calendar beside it, not the runtime default.
 *
 * The calendar is always Gregorian, as in the grid. A locale such as `th-TH`
 * or `fa-IR` defaults to another calendar, and its year then disagrees with
 * the grid. The time zone is always the local one, as in the grid, so a
 * `timeZone` in `options` cannot move the label to another day.
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

/**
 * Gregorian formatter for `locale`, shared by the single and range labels. A
 * picked date is local midnight, as the grid reads it, so the label reads it in
 * the local time zone too. A `timeZone` in `options` would move that midnight
 * to the day before or after, so it does not apply.
 */
function dateFormatter(locale?: string, options?: Intl.DateTimeFormatOptions): DateFormatter {
	return new DateFormatter(resolveLocale(locale), {
		...options,
		calendar: 'gregory',
		timeZone: undefined,
	})
}

/** Local midnight for a date, dropping the time of day. @internal */
export function startOfDay(date: Date): Date {
	return fromCalendarDate(toCalendarDate(date))
}

/**
 * Date moved by `step`, as {@link stepDay} moves a day. A step that leaves
 * years 1 to 9999 gives `date` itself, so a move at a limit stays put, as the
 * Calendar grid does.
 *
 * @internal
 */
export function stepDate(date: Date, step: DateDuration): Date {
	const moved = stepDay(toCalendarDate(date), step)

	return moved ? fromCalendarDate(moved) : date
}

/** Date confined to the inclusive `min`/`max` bounds (day resolution). @internal */
export function clampDate(date: Date, min?: Date, max?: Date): Date {
	return fromCalendarDate(clampDay(toCalendarDate(date), min, max))
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

/** The two dates with the earlier one first. @internal */
export function orderDates(a: Date, b: Date): [Date, Date] {
	return a.getTime() <= b.getTime() ? [a, b] : [b, a]
}
