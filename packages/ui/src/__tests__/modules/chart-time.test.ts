import { describe, expect, it } from 'vitest'
import { GUTTER_GAP, TICK_CHAR_WIDTH } from '../../modules/chart/chart-constants'
import { bandScale } from '../../modules/chart/chart-scale'
import { parseInstant, timeCategory, timeTicks } from '../../modules/chart/chart-time'

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
