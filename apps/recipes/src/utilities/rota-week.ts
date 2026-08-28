import { addDays, fromDay, toDay } from './day'

/**
 * The week and the month the board and the calendar are cut to.
 *
 * The week starts on Monday. It is not read from the locale, because a meal plan
 * is a household's own week rather than a rendering of one: a reader who plans
 * Monday to Sunday would find their week silently re-cut by a machine set to a
 * different region, and there is nothing on the board to tell them why.
 */

/** The day the week holding `day` starts on. */
export function weekStart(day: string): string {
	const date = fromDay(day)

	// `getDay` is 0 for Sunday, so Sunday is six days into a Monday week rather
	// than one day before it.
	const offset = (date.getDay() + 6) % 7

	return addDays(day, -offset)
}

/** The seven days of the week starting at `start`, in order. */
export function weekDays(start: string): string[] {
	return Array.from({ length: 7 }, (_unused, at) => addDays(start, at))
}

/** The week before the one starting at `start`. */
export function previousWeek(start: string): string {
	return addDays(start, -7)
}

/** The week after the one starting at `start`. */
export function nextWeek(start: string): string {
	return addDays(start, 7)
}

/** The `YYYY-MM` month a day falls in. */
export function toMonth(day: string): string {
	return day.slice(0, 7)
}

/** The first day of a `YYYY-MM` month. */
export function monthStart(month: string): string {
	return `${month}-01`
}

/**
 * A month moved by whole months.
 *
 * Built off the 1st, so a step from a 31-day month never lands in the month
 * after the one it was aimed at — which is what `setMonth` does to the 31st.
 */
export function addMonths(month: string, months: number): string {
	const date = fromDay(monthStart(month))

	date.setMonth(date.getMonth() + months)

	return toMonth(toDay(date))
}

/** Whether a `YYYY-MM` month is well formed, for a month read out of an address. */
export function isMonth(value: unknown): value is string {
	return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}
