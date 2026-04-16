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
	const ac = new Date(a.getFullYear(), a.getMonth(), a.getDate())
	const bc = new Date(b.getFullYear(), b.getMonth(), b.getDate())

	return ac.getTime() < bc.getTime()
}

export function isBetween(date: Date, start: Date, end: Date): boolean {
	const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
	const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
	const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime()

	const lo = Math.min(s, e)
	const hi = Math.max(s, e)

	return d > lo && d < hi
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
