/**
 * The text that gives the skeleton of a `DateTime` its size: the date in UTC,
 * in the shape of English text for the `Intl.DateTimeFormat` options, such as
 * `Nov 4, 2026, 1:00 AM` for `{ dateStyle: 'medium', timeStyle: 'short' }`.
 *
 * The code writes the text without `Intl`, so each JavaScript engine writes the
 * same text. The text of `Intl` comes from the date data of the engine, and two
 * engines can write different text for one format, such as a different word
 * between the day and the time. The skeleton is in the server markup and in
 * the hydration render, so text from `Intl` there can differ from the HTML of
 * the server. React then renders the tree again from the start, and each panel
 * in it plays its enter.
 *
 * The text only gives the skeleton a size, and it does not show. In a locale
 * that is not English, the size is an estimate.
 *
 * @internal
 */
export function standText(date: Date, options: Intl.DateTimeFormatOptions): string {
	const day = datePart(date, options)

	const time = timePart(date, options)

	if (day === null && time === null) return numericDate(date, 'numeric', 'numeric', 'numeric')

	if (day === null) return time ?? ''

	if (time === null) return day

	// A weekday alone goes before the time with a space, such as `Sun 5:00 PM`.
	if (onlyWeekday(options)) return `${day} ${time}`

	const glue = options.dateStyle === 'full' || options.dateStyle === 'long' ? ' at ' : ', '

	return `${day}${glue}${time}`
}

const MONTHS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
] as const

const WEEKDAYS = [
	'Sunday',
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
] as const

type Width = 'long' | 'short' | 'narrow'

type Digits = 'numeric' | '2-digit'

/** A name in a width: whole, its first three letters, or its first letter. */
function named(name: string, width: Width): string {
	if (width === 'long') return name

	return width === 'short' ? name.slice(0, 3) : name.slice(0, 1)
}

function twoDigits(value: number): string {
	return String(value).padStart(2, '0')
}

function onlyWeekday(options: Intl.DateTimeFormatOptions): boolean {
	return (
		options.weekday !== undefined &&
		options.dateStyle === undefined &&
		options.month === undefined &&
		options.day === undefined &&
		options.year === undefined
	)
}

/** A date with a numeric month, such as `11/4/2026`, from the parts that the format asks for. */
function numericDate(
	date: Date,
	month: Digits | null,
	day: Digits | null,
	year: Digits | null,
): string {
	const parts: string[] = []

	const digits = (value: number, form: Digits) =>
		form === '2-digit' ? twoDigits(value) : String(value)

	if (month !== null) parts.push(digits(date.getUTCMonth() + 1, month))

	if (day !== null) parts.push(digits(date.getUTCDate(), day))

	if (year !== null) {
		const full = date.getUTCFullYear()

		parts.push(year === '2-digit' ? twoDigits(full % 100) : String(full))
	}

	return parts.join('/')
}

/** The date of a `dateStyle`, such as `Nov 4, 2026` for `medium`. */
function styledDate(
	date: Date,
	style: NonNullable<Intl.DateTimeFormatOptions['dateStyle']>,
): string {
	const weekday = WEEKDAYS[date.getUTCDay()] ?? ''

	const month = MONTHS[date.getUTCMonth()] ?? ''

	const day = date.getUTCDate()

	const year = date.getUTCFullYear()

	switch (style) {
		case 'full':
			return `${weekday}, ${month} ${day}, ${year}`
		case 'long':
			return `${month} ${day}, ${year}`
		case 'medium':
			return `${named(month, 'short')} ${day}, ${year}`
		case 'short':
			return numericDate(date, 'numeric', 'numeric', '2-digit')
	}
}

/** A date with the name of its month, such as `Nov 4, 2026` or `November 2026`. */
function namedMonthDate(date: Date, options: Intl.DateTimeFormatOptions, width: Width): string {
	const month = named(MONTHS[date.getUTCMonth()] ?? '', width)

	const withDay = options.day === undefined ? month : `${month} ${date.getUTCDate()}`

	if (options.year === undefined) return withDay

	const full = date.getUTCFullYear()

	const year = options.year === '2-digit' ? twoDigits(full % 100) : String(full)

	return options.day === undefined ? `${withDay} ${year}` : `${withDay}, ${year}`
}

function isWidth(value: unknown): value is Width {
	return value === 'long' || value === 'short' || value === 'narrow'
}

function datePart(date: Date, options: Intl.DateTimeFormatOptions): string | null {
	if (options.dateStyle !== undefined) return styledDate(date, options.dateStyle)

	const parts: string[] = []

	if (options.weekday !== undefined) {
		parts.push(named(WEEKDAYS[date.getUTCDay()] ?? '', options.weekday))
	}

	const { month } = options

	if (isWidth(month)) {
		parts.push(namedMonthDate(date, options, month))
	} else if (month !== undefined || options.day !== undefined || options.year !== undefined) {
		parts.push(numericDate(date, month ?? null, options.day ?? null, options.year ?? null))
	}

	return parts.length === 0 ? null : parts.join(', ')
}

/** Whether the format writes the hour of a 12-hour clock, with `AM` or `PM`. */
function twelveHours(options: Intl.DateTimeFormatOptions): boolean {
	return options.hour12 !== false && options.hourCycle !== 'h23' && options.hourCycle !== 'h24'
}

/** The digits of the clock, such as `1:00` or `13:00:00`. */
function clock(date: Date, options: Intl.DateTimeFormatOptions): string {
	const hours = date.getUTCHours()

	const hour = twelveHours(options) ? String(hours % 12 === 0 ? 12 : hours % 12) : twoDigits(hours)

	const minute = twoDigits(date.getUTCMinutes())

	const second = twoDigits(date.getUTCSeconds())

	const style = options.timeStyle

	if (style === 'short') return `${hour}:${minute}`

	if (style !== undefined) return `${hour}:${minute}:${second}`

	const parts: string[] = []

	if (options.hour !== undefined) parts.push(hour)

	if (options.minute !== undefined) parts.push(minute)

	if (options.second !== undefined) parts.push(second)

	return parts.join(':')
}

/** The name of the zone that the format asks for, in UTC. */
function zoneName(options: Intl.DateTimeFormatOptions): string | null {
	if (options.timeStyle === 'full') return 'Coordinated Universal Time'

	if (options.timeStyle === 'long') return 'UTC'

	const name = options.timeZoneName

	if (name === undefined) return null

	return name === 'long' || name === 'longGeneric' ? 'Coordinated Universal Time' : 'UTC'
}

function timePart(date: Date, options: Intl.DateTimeFormatOptions): string | null {
	const hasHour = options.timeStyle !== undefined || options.hour !== undefined

	if (!hasHour && options.minute === undefined && options.second === undefined) return null

	const parts = [clock(date, options)]

	if (hasHour && twelveHours(options)) parts.push(date.getUTCHours() < 12 ? 'AM' : 'PM')

	const zone = zoneName(options)

	if (zone !== null) parts.push(zone)

	return parts.join(' ')
}
