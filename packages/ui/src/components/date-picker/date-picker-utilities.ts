import { fromCalendarDate, toCalendarDate } from '../calendar/calendar-utilities'

export function formatDate(date: Date): string {
	return date.toLocaleDateString()
}

export function formatRange(start: Date, end: Date): string {
	return `${formatDate(start)} – ${formatDate(end)}`
}

export function startOfDay(date: Date): Date {
	return fromCalendarDate(toCalendarDate(date))
}

export function addDays(date: Date, amount: number): Date {
	return fromCalendarDate(toCalendarDate(date).add({ days: amount }))
}

/** Clamps day-of-month to the target month's length (Jan 31 + 1 month → Feb 28/29). */
export function addMonths(date: Date, amount: number): Date {
	return fromCalendarDate(toCalendarDate(date).add({ months: amount }))
}

export function clampDate(date: Date, min?: Date, max?: Date): Date {
	let value = toCalendarDate(date)

	if (min && value.compare(toCalendarDate(min)) < 0) value = toCalendarDate(min)

	if (max && value.compare(toCalendarDate(max)) > 0) value = toCalendarDate(max)

	return fromCalendarDate(value)
}
