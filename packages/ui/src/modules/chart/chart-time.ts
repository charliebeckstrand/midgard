/**
 * Time ticks for a date-keyed band axis: calendar-boundary ticks placed at
 * their true position between the evenly spaced row centers, formatted for the
 * locale. The rows stay index-aligned on the band scale — this only chooses,
 * places, and labels the axis ticks — so a date-keyed chart reuses every mark,
 * hit test, crosshair, and keyboard interaction unchanged; the ticks track
 * time, the marks track order.
 *
 * Boundary stepping goes through `@internationalized/date`'s calendar
 * arithmetic (DST- and month-length-safe) rather than raw millisecond math;
 * only a tick's *position* interpolates on absolute time, between the finite
 * rows it falls among. Kept React- and style-free beside `chart-scale.ts` so
 * the tick math is unit-testable in isolation.
 */

import {
	CalendarDateTime,
	DateFormatter,
	getLocalTimeZone,
	startOfWeek,
} from '@internationalized/date'
import type { ChartAxisTick } from './chart-axis'
import { GUTTER_GAP, TICK_CHAR_WIDTH } from './chart-constants'
import type { BandScale } from './chart-scale'

/** One millisecond span per calendar unit, for choosing a tick interval. @internal */
const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 30 * DAY
const YEAR = 365 * DAY

/** A bare `YYYY-MM-DD` reads as a local wall-clock day, not a UTC instant. @internal */
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

/** A day's worth of tick labels never share the axis, so cap the walk far above any real count. @internal */
const MAX_TICKS = 100

/** Roughly the widest tick label ("Jan 26", "Jan 5") in characters, for the fit estimate. @internal */
const LABEL_CHARS = 7

/**
 * Coalesces an optional locale to a concrete BCP 47 tag, falling back to the
 * runtime default — the lib's locale-aware helpers require a string.
 *
 * @internal
 */
function resolveLocale(locale?: string): string {
	return locale ?? new Intl.DateTimeFormat().resolvedOptions().locale
}

/**
 * Parses a raw category value to an epoch-millisecond instant: a `Date`, a
 * number (already epoch ms), or a string. A bare `YYYY-MM-DD` becomes local
 * midnight so a daily key lands on its wall-clock day rather than shifting
 * across the UTC boundary; any other string goes through `Date.parse`.
 *
 * @returns The instant, or `null` when the value holds no parseable date — the
 * row then anchors no tick and the axis falls back to plain labels.
 * @internal
 */
export function parseInstant(value: unknown): number | null {
	if (value instanceof Date) {
		const time = value.getTime()

		return Number.isNaN(time) ? null : time
	}

	if (typeof value === 'number') return Number.isFinite(value) ? value : null

	if (typeof value === 'string') {
		const parts = DATE_ONLY.exec(value)

		if (parts) return new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])).getTime()

		const time = Date.parse(value)

		return Number.isNaN(time) ? null : time
	}

	return null
}

/** A native `Date` as a local wall-clock `CalendarDateTime`, mirroring the calendar's day semantics. @internal */
function toCalendarDateTime(date: Date): CalendarDateTime {
	return new CalendarDateTime(
		date.getFullYear(),
		date.getMonth() + 1,
		date.getDate(),
		date.getHours(),
		date.getMinutes(),
		date.getSeconds(),
		date.getMilliseconds(),
	)
}

/** Zeroes a datetime's time-of-day, for a day-or-coarser boundary. @internal */
const ZERO = { hour: 0, minute: 0, second: 0, millisecond: 0 } as const

/** The first month of the quarter holding `month` (1-based): 1, 4, 7, or 10. @internal */
function quarterStart(month: number): number {
	return Math.floor((month - 1) / 3) * 3 + 1
}

/**
 * One nice tick interval: its approximate millisecond span (for matching the
 * target spacing), the boundary its ticks snap to, and how it advances. The
 * ladder runs hour → year so a span of any length lands clean calendar ticks.
 *
 * @internal
 */
type TimeInterval = {
	approx: number
	floor: (date: CalendarDateTime, locale: string) => CalendarDateTime
	next: (date: CalendarDateTime) => CalendarDateTime
}

const floorHour = (date: CalendarDateTime) => date.set({ minute: 0, second: 0, millisecond: 0 })
const floorDay = (date: CalendarDateTime) => date.set(ZERO)
const floorWeek = (date: CalendarDateTime, locale: string) => startOfWeek(date.set(ZERO), locale)
const floorMonth = (date: CalendarDateTime) => date.set({ day: 1, ...ZERO })
const floorQuarter = (date: CalendarDateTime) =>
	date.set({ month: quarterStart(date.month), day: 1, ...ZERO })
const floorHalf = (date: CalendarDateTime) =>
	date.set({ month: date.month <= 6 ? 1 : 7, day: 1, ...ZERO })
const floorYear = (date: CalendarDateTime) => date.set({ month: 1, day: 1, ...ZERO })

const INTERVALS: readonly TimeInterval[] = [
	{ approx: HOUR, floor: floorHour, next: (d) => d.add({ hours: 1 }) },
	{ approx: 3 * HOUR, floor: floorHour, next: (d) => d.add({ hours: 3 }) },
	{ approx: 6 * HOUR, floor: floorHour, next: (d) => d.add({ hours: 6 }) },
	{ approx: 12 * HOUR, floor: floorHour, next: (d) => d.add({ hours: 12 }) },
	{ approx: DAY, floor: floorDay, next: (d) => d.add({ days: 1 }) },
	{ approx: 2 * DAY, floor: floorDay, next: (d) => d.add({ days: 2 }) },
	{ approx: WEEK, floor: floorWeek, next: (d) => d.add({ weeks: 1 }) },
	{ approx: MONTH, floor: floorMonth, next: (d) => d.add({ months: 1 }) },
	{ approx: 3 * MONTH, floor: floorQuarter, next: (d) => d.add({ months: 3 }) },
	{ approx: 6 * MONTH, floor: floorHalf, next: (d) => d.add({ months: 6 }) },
	{ approx: YEAR, floor: floorYear, next: (d) => d.add({ years: 1 }) },
	{ approx: 2 * YEAR, floor: floorYear, next: (d) => d.add({ years: 2 }) },
	{ approx: 5 * YEAR, floor: floorYear, next: (d) => d.add({ years: 5 }) },
	{ approx: 10 * YEAR, floor: floorYear, next: (d) => d.add({ years: 10 }) },
]

/** The `Intl` options for a tick at `approx` spacing over a `spanMs` domain. @internal */
function formatOptionsFor(approx: number, spanMs: number): Intl.DateTimeFormatOptions {
	if (approx >= YEAR) return { year: 'numeric' }

	if (approx >= MONTH)
		return spanMs > 1.5 * YEAR ? { month: 'short', year: '2-digit' } : { month: 'short' }

	if (approx >= DAY)
		return spanMs > 300 * DAY
			? { month: 'short', day: 'numeric', year: '2-digit' }
			: { month: 'short', day: 'numeric' }

	return { hour: 'numeric' }
}

/** A finite row instant paired with the row index whose band center anchors it. @internal */
type Anchor = { index: number; time: number }

/**
 * Positions instant `time` on the band axis by locating it among the anchor
 * rows and interpolating between their band centers — the tick lands at its
 * true fraction of the way from one dated row to the next, clamped to the ends.
 *
 * @internal
 */
function positionOf(time: number, anchors: Anchor[], band: BandScale): number {
	const first = anchors[0] as Anchor
	const last = anchors[anchors.length - 1] as Anchor

	if (time <= first.time) return band.center(first.index)

	if (time >= last.time) return band.center(last.index)

	let low = 0

	while (low < anchors.length - 1 && (anchors[low + 1] as Anchor).time <= time) low++

	const a = anchors[low] as Anchor
	const b = anchors[low + 1] as Anchor

	const fraction = b.time === a.time ? 0 : (time - a.time) / (b.time - a.time)

	return band.center(a.index) + fraction * (band.center(b.index) - band.center(a.index))
}

/** Picks the interval whose spacing is the smallest that meets the ideal step. @internal */
function chooseInterval(idealStep: number): TimeInterval {
	return (
		INTERVALS.find((interval) => interval.approx >= idealStep) ?? (INTERVALS.at(-1) as TimeInterval)
	)
}

/** Options for {@link timeTicks}. @internal */
export type TimeTicksOptions = {
	/** Each row's instant as epoch ms, in row order; `null` for an unparseable row. */
	times: (number | null)[]
	/** The band scale placing the rows — ticks interpolate between its centers. */
	band: BandScale
	/** Tick count to aim for; the interval ladder lands near it, not exactly on it. */
	tickTarget: number
	/** Band-axis length in `viewBox` units, capping how many labels fit without collision. */
	axisLength: number
	/** BCP 47 locale for the tick labels; defaults to the runtime locale. */
	locale?: string
}

/**
 * Calendar-boundary ticks for a date-keyed band axis.
 *
 * @returns The ticks — position and formatted label — or `null` when fewer than
 * two rows carry a parseable, spanning date, so the caller falls back to plain
 * category labels.
 * @internal
 */
export function timeTicks(options: TimeTicksOptions): ChartAxisTick[] | null {
	const { times, band, tickTarget, axisLength } = options

	const anchors: Anchor[] = []

	for (let index = 0; index < times.length; index++) {
		const time = times[index]

		if (time != null && Number.isFinite(time)) anchors.push({ index, time })
	}

	if (anchors.length < 2) return null

	const first = anchors[0] as Anchor
	const last = anchors[anchors.length - 1] as Anchor

	const spanMs = last.time - first.time

	if (spanMs <= 0) return null

	const locale = resolveLocale(options.locale)

	const maxFit = Math.max(1, Math.floor(axisLength / (LABEL_CHARS * TICK_CHAR_WIDTH + GUTTER_GAP)))

	const target = Math.max(1, Math.min(tickTarget, maxFit))

	const interval = chooseInterval(spanMs / target)

	const format = new DateFormatter(locale, formatOptionsFor(interval.approx, spanMs))

	const ticks: ChartAxisTick[] = []

	let cursor = interval.floor(toCalendarDateTime(new Date(first.time)), locale)

	for (let guard = 0; guard < MAX_TICKS; guard++) {
		const date = cursor.toDate(getLocalTimeZone())

		const time = date.getTime()

		if (time > last.time) break

		// Keyed by the instant, not the mapped `at` — distinct per calendar boundary
		// and stable across resizes, where `at` can collapse onto one coordinate.
		if (time >= first.time)
			ticks.push({ at: positionOf(time, anchors, band), label: format.format(date), key: time })

		cursor = interval.next(cursor)
	}

	// The interval targets the fit, but uneven calendar steps can overshoot it;
	// thin to every nth so labels never collide.
	if (ticks.length > maxFit) {
		const nth = Math.ceil(ticks.length / maxFit)

		return ticks.filter((_, index) => index % nth === 0)
	}

	return ticks
}

/** A one-or-two-digit number zero-padded to two, for a numeric date field. @internal */
function pad2(value: number): string {
	return String(value).padStart(2, '0')
}

/**
 * A numeric date formatter for a plain category axis: when *every* category
 * value parses as a date, labels them `MM-DD` — or `MM-DD-YYYY` once any of
 * them falls outside `referenceYear` (the current year by default), so a
 * cross-year span keeps the year and a single-year one drops it. Returns `null`
 * when any value is not a date, leaving a non-date axis its raw labels; the
 * same formatter labels the axis ticks, tooltip, and data table.
 *
 * @param values - Each row's raw `xKey` value, in row order.
 * @param referenceYear - The year that reads without a suffix; defaults to the
 * current calendar year.
 * @internal
 */
export function dateCategoryFormat(
	values: unknown[],
	referenceYear: number = new Date().getFullYear(),
): ((value: unknown) => string) | null {
	if (values.length === 0) return null

	// One pass with an early exit: the usual non-date axis fails on its first
	// value, so detection costs one parse instead of one per row — `Date.parse`
	// on an arbitrary string is expensive, and a mapped-then-checked pass paid
	// it for the whole dataset before answering "not dates".
	let withYear = false

	for (const value of values) {
		const time = parseInstant(value)

		if (time === null) return null

		if (new Date(time).getFullYear() !== referenceYear) withYear = true
	}

	return (value) => {
		const time = parseInstant(value)

		if (time === null) return String(value)

		const date = new Date(time)

		const md = `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`

		return withYear ? `${md}-${date.getFullYear()}` : md
	}
}

/**
 * A category formatter for a time axis: each row's raw `xKey` value as a medium
 * locale date, so the tooltip and data table read the same dates the axis
 * labels do. An unparseable value falls back to its string form. Holds one
 * formatter across the rows.
 *
 * @internal
 */
export function timeCategory(locale?: string): (value: unknown) => string {
	const format = new DateFormatter(resolveLocale(locale), {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	})

	return (value) => {
		const time = parseInstant(value)

		return time === null ? String(value) : format.format(new Date(time))
	}
}
