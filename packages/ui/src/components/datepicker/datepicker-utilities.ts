export function formatDate(date: Date): string {
	return date.toLocaleDateString()
}

export function formatRange(start: Date, end: Date): string {
	return `${formatDate(start)} – ${formatDate(end)}`
}

export function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date: Date, amount: number): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount)
}

export function clampDate(date: Date, min?: Date, max?: Date): Date {
	const value = startOfDay(date).getTime()

	const minValue = min ? startOfDay(min).getTime() : Number.NEGATIVE_INFINITY
	const maxValue = max ? startOfDay(max).getTime() : Number.POSITIVE_INFINITY

	const clamped = Math.min(Math.max(value, minValue), maxValue)

	return new Date(clamped)
}
