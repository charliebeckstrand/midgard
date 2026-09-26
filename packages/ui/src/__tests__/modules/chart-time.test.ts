// @vitest-environment node
import { resetLocalTimeZone, setLocalTimeZone } from '@internationalized/date'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { GUTTER_GAP, TICK_CHAR_WIDTH } from '../../modules/chart/engine/chart-constants'
import { bandScale } from '../../modules/chart/engine/chart-scale'
import {
	dateCategoryFormat,
	parseInstant,
	timeCategory,
	timeTicks,
} from '../../modules/chart/engine/chart-time'

/** A band scale placing `count` rows evenly across `[0, length]`. */
function band(count: number, length = 600) {
	return bandScale({ count, range: [0, length] })
}

/** `count` consecutive daily instants (local midnight) from `2026-01-01`, in ms. */
function dailyTimes(count: number): number[] {
	const start = new Date(2026, 0, 1).getTime()

	return Array.from({ length: count }, (_, index) => start + index * 86_400_000)
}

describe('parseInstant', () => {
	it('reads Dates, epoch numbers, and ISO strings', () => {
		const date = new Date(2026, 2, 15, 9, 30)

		expect(parseInstant(date)).toBe(date.getTime())

		expect(parseInstant(1_700_000_000_000)).toBe(1_700_000_000_000)

		expect(parseInstant('2026-03-15T09:30:00Z')).toBe(Date.parse('2026-03-15T09:30:00Z'))
	})

	it('reads a bare YYYY-MM-DD as a local wall-clock day', () => {
		// Local midnight, not the UTC instant — so a daily key lands on its own day
		// regardless of the runtime timezone.
		expect(parseInstant('2026-03-15')).toBe(new Date(2026, 2, 15).getTime())
	})

	it('returns null for unparseable or non-date values', () => {
		expect(parseInstant('not a date')).toBeNull()

		expect(parseInstant(new Date('nope'))).toBeNull()

		expect(parseInstant(Number.NaN)).toBeNull()

		expect(parseInstant(null)).toBeNull()

		expect(parseInstant({})).toBeNull()
	})
})

describe('timeTicks', () => {
	it('needs at least two spanning instants', () => {
		const scale = band(1)

		expect(
			timeTicks({ times: [dailyTimes(1)[0] ?? 0], band: scale, tickTarget: 4, axisLength: 600 }),
		).toBeNull()

		expect(
			timeTicks({ times: [null, null], band: scale, tickTarget: 4, axisLength: 600 }),
		).toBeNull()

		// Two rows on the same instant span nothing.
		const t = dailyTimes(1)[0] ?? 0

		expect(timeTicks({ times: [t, t], band: band(2), tickTarget: 4, axisLength: 600 })).toBeNull()
	})

	it('lines a quarter of daily rows with month-start ticks', () => {
		// 2026-01-01 through 2026-03-31 — the interval lands on month boundaries.
		const scale = band(90)

		const ticks = timeTicks({
			times: dailyTimes(90),
			band: scale,
			tickTarget: 4,
			axisLength: 600,
			locale: 'en-US',
		})

		expect(ticks?.map((tick) => tick.label)).toEqual(['Jan', 'Feb', 'Mar'])

		// Each month-start falls on its own daily row, so the tick sits on that band center.
		expect(ticks?.[0]?.at).toBeCloseTo(scale.center(0))

		expect(ticks?.[1]?.at).toBeCloseTo(scale.center(31))

		expect(ticks?.[2]?.at).toBeCloseTo(scale.center(59))
	})

	it('interpolates a boundary that lands between rows', () => {
		// Mid-month samples: the month-start ticks fall between the dated rows.
		const times = [
			new Date(2026, 0, 15).getTime(),
			new Date(2026, 1, 15).getTime(),
			new Date(2026, 2, 15).getTime(),
		]

		const scale = band(3)

		const ticks = timeTicks({ times, band: scale, tickTarget: 4, axisLength: 600, locale: 'en-US' })

		expect(ticks?.map((tick) => tick.label)).toEqual(['Feb', 'Mar'])

		// Feb 1 sits between Jan 15 (row 0) and Feb 15 (row 1), Mar 1 between rows 1 and 2.
		const feb = ticks?.[0]?.at ?? 0
		const mar = ticks?.[1]?.at ?? 0

		expect(feb).toBeGreaterThan(scale.center(0))

		expect(feb).toBeLessThan(scale.center(1))

		expect(mar).toBeGreaterThan(scale.center(1))

		expect(mar).toBeLessThan(scale.center(2))
	})

	it('labels multi-year spans with the year and steps to a coarser interval', () => {
		// Four years of month-start rows — the axis reads years, not months.
		const times = Array.from({ length: 48 }, (_, index) =>
			new Date(2024 + Math.floor(index / 12), index % 12, 1).getTime(),
		)

		const ticks = timeTicks({
			times,
			band: band(48),
			tickTarget: 4,
			axisLength: 600,
			locale: 'en-US',
		})

		expect(ticks?.map((tick) => tick.label)).toEqual(['2024', '2025', '2026', '2027'])
	})

	it('draws calendar ticks for rows in newest-first order', () => {
		const times = dailyTimes(30).reverse()

		expect(
			timeTicks({ times, band: band(30), tickTarget: 5, axisLength: 600, locale: 'en-US' }),
		).not.toBeNull()
	})

	it('lands a decade interval on decade years', () => {
		// Yearly rows from 2003 to 2042. A 40-year span at 5 ticks takes the 10-year step.
		const times = Array.from({ length: 40 }, (_, index) => new Date(2003 + index, 0, 1).getTime())

		const labels = (
			timeTicks({ times, band: band(40), tickTarget: 5, axisLength: 600, locale: 'en-US' }) ?? []
		).map((tick) => tick.label)

		expect(labels.length).toBeGreaterThan(0)

		expect(labels.every((label) => Number(label) % 10 === 0)).toBe(true)
	})

	it('lands a 12-hour interval on midnight and noon', () => {
		// Hourly rows from 01:00, over two days.
		const start = new Date(2026, 5, 1, 1).getTime()

		const times = Array.from({ length: 48 }, (_, index) => start + index * 3_600_000)

		const hours = (
			timeTicks({ times, band: band(48), tickTarget: 5, axisLength: 600, locale: 'en-US' }) ?? []
		).map((tick) => new Date(tick.key as number).getHours())

		expect(hours.length).toBeGreaterThan(0)

		expect(hours.every((hour) => hour % 12 === 0)).toBe(true)
	})

	it('never packs more ticks than the axis fits', () => {
		const ticks = timeTicks({
			times: dailyTimes(365),
			band: band(365),
			tickTarget: 12,
			axisLength: 240,
			locale: 'en-US',
		})

		const maxFit = Math.max(1, Math.floor(240 / (7 * TICK_CHAR_WIDTH + GUTTER_GAP)))

		expect(ticks?.length).toBeLessThanOrEqual(maxFit)
	})
})

describe('timeTicks over the spring daylight-saving gap', () => {
	// The gap needs a zone with daylight-saving time, and the suite pins UTC.
	// Node reads a new TZ at once, and the date library keeps its own zone.
	const zone = process.env.TZ

	beforeAll(() => {
		process.env.TZ = 'America/New_York'

		setLocalTimeZone('America/New_York')
	})

	afterAll(() => {
		process.env.TZ = zone

		resetLocalTimeZone()
	})

	it('keeps one tick for each distinct instant', () => {
		// 2026-03-08 02:00 does not exist in New York.
		const start = new Date(2026, 2, 8, 0, 0).getTime()

		const times = Array.from({ length: 7 }, (_, index) => start + index * 3_600_000)

		const ticks =
			timeTicks({ times, band: band(7, 800), tickTarget: 10, axisLength: 800, locale: 'en-US' }) ??
			[]

		const keys = ticks.map((tick) => tick.key)

		expect(keys.length).toBeGreaterThan(1)

		expect(new Set(keys).size).toBe(keys.length)
	})
})

describe('timeCategory', () => {
	it('formats a row value as a medium locale date', () => {
		const format = timeCategory('en-US')

		expect(format('2026-01-05')).toBe('Jan 5, 2026')

		expect(format(new Date(2026, 0, 5))).toBe('Jan 5, 2026')
	})

	it('falls back to the string form of an unparseable value', () => {
		expect(timeCategory('en-US')('Q1')).toBe('Q1')
	})
})

describe('dateCategoryFormat', () => {
	it('labels a single-year span month/day, dropping the reference year', () => {
		const format = dateCategoryFormat(['2026-06-10', '2026-07-04', '2026-12-31'], 2026, 'en-US')

		expect(format).not.toBeNull()

		expect(format?.('2026-06-10')).toBe('06/10')

		expect(format?.('2026-12-31')).toBe('12/31')
	})

	it('keeps the year once any value falls outside the reference year', () => {
		const format = dateCategoryFormat(['2025-12-30', '2026-01-02'], 2026, 'en-US')

		expect(format?.('2025-12-30')).toBe('12/30/2025')

		expect(format?.('2026-01-02')).toBe('01/02/2026')
	})

	it("reads the locale's own field order, not a fixed month-first one", () => {
		const single = dateCategoryFormat(['2026-06-10', '2026-07-04'], 2026, 'de-DE')

		// de-DE writes day-first with a trailing separator; en-GB day-first with a slash.
		expect(single?.('2026-06-10')).toBe('10.06.')

		expect(dateCategoryFormat(['2026-06-10'], 2026, 'en-GB')?.('2026-06-10')).toBe('10/06')

		const crossYear = dateCategoryFormat(['2025-12-30', '2026-01-02'], 2026, 'de-DE')

		expect(crossYear?.('2025-12-30')).toBe('30.12.2025')
	})

	it('reads Dates, not just ISO strings', () => {
		const format = dateCategoryFormat([new Date(2026, 5, 10), new Date(2026, 6, 4)], 2026, 'en-US')

		expect(format?.(new Date(2026, 5, 10))).toBe('06/10')
	})

	it('returns null when any value is not a date, so a plain axis keeps its labels', () => {
		expect(dateCategoryFormat(['2026-06-10', 'Q3'], 2026)).toBeNull()

		expect(dateCategoryFormat([], 2026)).toBeNull()
	})

	it('never treats bare numeric strings as dates — Date.parse reads "95190" as year 95190', () => {
		// An axis of NMFC codes rendered as 01-01-95190 ticks (live 2026-07-17)
		expect(dateCategoryFormat(['95190', '133300', '156600'], 2026)).toBeNull()

		expect(dateCategoryFormat(['2026-06-10', '95190'], 2026)).toBeNull()
	})

	it('returns null for numeric categories, so a year axis keeps its labels', () => {
		// A bar chart with a numeric `year` key.
		expect(dateCategoryFormat([2021, 2022, 2023], 2026, 'en-US')).toBeNull()
	})

	it('returns null for "<word> <n>" labels, so a plain axis keeps its labels', () => {
		expect(dateCategoryFormat(['Week 1', 'Week 2', 'Week 3', 'Week 4'], 2026, 'en-US')).toBeNull()
	})
})
