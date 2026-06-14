import { fromCalendarDate, toCalendarDate } from '../calendar/calendar-utilities'

/** Trigger label for a single date, in the user's locale. @internal */
export function formatDate(date: Date): string {
	return date.toLocaleDateString()
}

/** Trigger label for a range, both endpoints in the user's locale. @internal */
export function formatRange(start: Date, end: Date): string {
	return `${formatDate(start)} – ${formatDate(end)}`
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

/** Date confined to the inclusive `min`/`max` bounds (day resolution). @internal */
export function clampDate(date: Date, min?: Date, max?: Date): Date {
	let value = toCalendarDate(date)

	if (min && value.compare(toCalendarDate(min)) < 0) value = toCalendarDate(min)

	if (max && value.compare(toCalendarDate(max)) > 0) value = toCalendarDate(max)

	return fromCalendarDate(value)
}
