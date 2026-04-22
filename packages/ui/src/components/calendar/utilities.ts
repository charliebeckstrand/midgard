export const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export const MONTHS = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
]

export function isSameDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	)
}

export function isBeforeDay(a: Date, b: Date): boolean {
	const ay = a.getFullYear()
	const by = b.getFullYear()

	if (ay !== by) return ay < by

	const am = a.getMonth()
	const bm = b.getMonth()

	if (am !== bm) return am < bm

	return a.getDate() < b.getDate()
}

export function isBetween(date: Date, start: Date, end: Date): boolean {
	const [lo, hi] = isBeforeDay(start, end) ? [start, end] : [end, start]

	return isBeforeDay(lo, date) && isBeforeDay(date, hi)
}

function getDaysInMonth(year: number, month: number): number {
	return new Date(year, month + 1, 0).getDate()
}

export function getCalendarDays(year: number, month: number): Date[] {
	const daysInMonth = getDaysInMonth(year, month)

	const days: Date[] = []

	for (let d = 1; d <= daysInMonth; d++) {
		days.push(new Date(year, month, d))
	}

	return days
}
