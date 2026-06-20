/**
 * Supported date layout for {@link DateInput}: month/day/year order and the
 * segment separator. Drives masking, parsing, and the canonical display text.
 */
export type DateInputFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'

/** One of the three date components. @internal */
type DatePart = 'month' | 'day' | 'year'

/** A single segment in a date layout. @internal */
type Segment = {
	part: DatePart
	length: number
	/** Highest value the segment can hold; a digit that would exceed it pads the segment and carries over. */
	cap?: number
}

const month: Segment = { part: 'month', length: 2, cap: 12 }
const day: Segment = { part: 'day', length: 2, cap: 31 }
const year: Segment = { part: 'year', length: 4 }

const layouts: Record<DateInputFormat, { separator: string; segments: Segment[] }> = {
	'MM/DD/YYYY': { separator: '/', segments: [month, day, year] },
	'DD/MM/YYYY': { separator: '/', segments: [day, month, year] },
	'YYYY-MM-DD': { separator: '-', segments: [year, month, day] },
}

/** Segment separator for a format (`/` or `-`). @internal */
export function dateInputSeparator(format: DateInputFormat): string {
	return layouts[format].separator
}

/** Running mask state: closed segments and the segment being typed. @internal */
type MaskState = {
	done: string[]
	current: string
}

/**
 * Carries over a capped segment (month/day): a leading digit too large to start
 * it, or a second digit that overflows the cap, zero-pads and closes it.
 *
 * @returns The loop action, or `null` when no cap rule applies.
 * @internal
 */
function applyCapRule(
	pending: string,
	digit: number,
	cap: number,
	segmentLength: number,
	state: MaskState,
): 'stop' | 'retry' | null {
	if (state.current.length === 0 && digit * 10 > cap) {
		state.done.push(`0${pending}`)

		state.current = ''

		return 'stop'
	}

	if (state.current.length === 1 && Number(state.current + pending) > cap) {
		state.done.push(state.current.padStart(segmentLength, '0'))

		state.current = ''

		return 'retry'
	}

	// No month or day starts with 00; drop the second zero.
	if (state.current === '0' && digit === 0) return 'stop'

	return null
}

/**
 * Applies one character to the current segment.
 *
 * @returns `'retry'` to re-run the same character against the next segment (a
 * cap carry), `'stop'` to end this character, `'consumed'` once it fills the
 * segment.
 * @internal
 */
function consumeMaskChar(
	pending: string,
	segment: Segment,
	state: MaskState,
): 'stop' | 'retry' | 'consumed' {
	if (!/\d/.test(pending)) {
		// A separator zero-pads and closes a short month or day; it does nothing
		// on an empty, zero-only, or year segment.
		if (state.current.length > 0 && Number(state.current) > 0 && segment.part !== 'year') {
			state.done.push(state.current.padStart(segment.length, '0'))

			state.current = ''
		}

		return 'stop'
	}

	const digit = Number(pending)

	if (segment.cap !== undefined) {
		const capResult = applyCapRule(pending, digit, segment.cap, segment.length, state)

		if (capResult) return capResult
	}

	state.current += pending

	if (state.current.length === segment.length) {
		state.done.push(state.current)

		state.current = ''
	}

	return 'consumed'
}

/**
 * Joins the masked segments, appending a trailing separator to seat the caret
 * for the next one when a segment was just closed.
 *
 * @internal
 */
function joinMaskedSegments(state: MaskState, separator: string, segmentCount: number): string {
	const { done, current } = state

	if (current) return done.length > 0 ? `${done.join(separator)}${separator}${current}` : current

	if (done.length === 0) return ''

	return done.length === segmentCount ? done.join(separator) : `${done.join(separator)}${separator}`
}

/**
 * Masks raw text into the format's `MM`/`DD`/`YYYY` segments. Digits fill the
 * current segment. A digit that would push a capped segment past its cap
 * zero-pads it and starts the next (`13` → `01/3`); an unseparated run like
 * `152026` lands as `01/05/2026`. A typed separator zero-pads and closes a
 * short month or day (`1/` → `01/`), and a completed segment appends the
 * canonical separator for the next.
 *
 * @internal
 */
export function maskDateText(raw: string, format: DateInputFormat): string {
	const { separator, segments } = layouts[format]

	const state: MaskState = { done: [], current: '' }

	for (const char of raw) {
		// A digit the capped segment cannot take re-enters the loop against the
		// next segment.
		let pending: string | null = char

		while (pending !== null && state.done.length < segments.length) {
			const segment = segments[state.done.length]

			if (!segment) break

			const result = consumeMaskChar(pending, segment, state)

			if (result === 'stop') break

			if (result === 'retry') continue

			pending = null
		}
	}

	return joinMaskedSegments(state, separator, segments.length)
}

/** Formats a Date as the canonical zero-padded text for the format. @internal */
export function formatDateValue(date: Date, format: DateInputFormat): string {
	const { separator, segments } = layouts[format]

	const parts: Record<DatePart, string> = {
		month: String(date.getMonth() + 1).padStart(2, '0'),
		day: String(date.getDate()).padStart(2, '0'),
		year: String(date.getFullYear()).padStart(4, '0'),
	}

	return segments.map((segment) => parts[segment.part]).join(separator)
}

const THIRTY_DAY_MONTHS = new Set([4, 6, 9, 11])

/** Day count for a 1-based month, accounting for leap years. @internal */
function daysInMonth(year: number, month: number): number {
	if (month !== 2) return THIRTY_DAY_MONTHS.has(month) ? 30 : 31

	const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)

	return leap ? 29 : 28
}

/**
 * Parses masked text back to a Date at local midnight. Returns `undefined`
 * unless every segment is complete and the result is a real calendar date
 * (`02/31/2025` fails, as does year `0000`).
 *
 * @internal
 */
export function parseDateText(text: string, format: DateInputFormat): Date | undefined {
	const { separator, segments } = layouts[format]

	const pieces = text.split(separator)

	if (pieces.length !== segments.length) return undefined

	const values: Partial<Record<DatePart, number>> = {}

	for (const [index, segment] of segments.entries()) {
		const piece = pieces[index]

		if (piece === undefined || piece.length !== segment.length) return undefined

		values[segment.part] = Number(piece)
	}

	const { month, day, year } = values

	if (month === undefined || day === undefined || year === undefined) return undefined

	if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month))
		return undefined

	const date = new Date(year, month - 1, day)

	// Two-digit years would otherwise resolve to 19xx.
	date.setFullYear(year)

	return date
}

/**
 * Fills a trailing two-digit year into the 2000s (`12/25/26` → `12/25/2026`)
 * once every other segment is complete, so a year-last entry resolves on blur.
 * Leaves anything else untouched: a still-partial entry, a one- or three-digit
 * year mid-typing, an already four-digit year, or a year-first format whose
 * short year cannot be separated from the rest.
 *
 * @internal
 */
export function expandTwoDigitYear(text: string, format: DateInputFormat): string {
	const { separator, segments } = layouts[format]

	const pieces = text.split(separator)

	if (pieces.length !== segments.length) return text

	const yearIndex = segments.findIndex((segment) => segment.part === 'year')

	const filled = segments.every(
		(segment, index) => pieces[index]?.length === (index === yearIndex ? 2 : segment.length),
	)

	if (!filled) return text

	return pieces.map((piece, index) => (index === yearIndex ? `20${piece}` : piece)).join(separator)
}

/** Same calendar day in local time; two empty values count as the same. @internal */
export function isSameDay(a: Date | undefined, b: Date | undefined): boolean {
	if (a === undefined || b === undefined) return a === b

	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	)
}

/** Comparable integer key for a date's calendar day, ignoring time. @internal */
function dayKey(date: Date): number {
	return date.getFullYear() * 10_000 + date.getMonth() * 100 + date.getDate()
}

/** Day-resolution bounds check; ignores time of day on `min`/`max`. @internal */
export function isDayInRange(date: Date, min?: Date, max?: Date): boolean {
	if (min && dayKey(date) < dayKey(min)) return false

	if (max && dayKey(date) > dayKey(max)) return false

	return true
}
