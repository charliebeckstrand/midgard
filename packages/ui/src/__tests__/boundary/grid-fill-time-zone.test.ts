import { describe, expect, it, vi } from 'vitest'
import { fillLine } from '../../modules/grid/engine/grid-range/fill'

/**
 * A fill of dates in a zone with daylight saving time. A day of the change is
 * not 24 hours long, so a time of day kept as milliseconds from midnight moves
 * the clock on that day. A case in UTC passes on that defect.
 *
 * A worker thread keeps the zone that it started with, and a write to
 * `process.env.TZ` there has no effect. This suite sits in `boundary/`, which
 * the `integration` project runs on forks. A fork reads a new `TZ` at once.
 */

/** Moves the process to New York for the case. */
const inNewYork = vi.defineHelper(() => {
	vi.stubEnv('TZ', 'America/New_York')

	expect(new Date(2026, 0, 1).getTimezoneOffset(), 'the zone change took no effect').toBe(300)
})

describe('a fill of dates across a change of daylight saving time', () => {
	it('keeps the time of day on the day that the clocks go forward', () => {
		inNewYork()

		// 2026-03-08 is the change to daylight saving time in New York.
		const at = (date: number) => new Date(2026, 2, date, 9, 30)

		const filled = fillLine([at(6), at(7)], 3) as Date[]

		expect(filled.map((date) => [date.getDate(), date.getHours(), date.getMinutes()])).toEqual([
			[8, 9, 30],
			[9, 9, 30],
			[10, 9, 30],
		])
	})

	it('keeps the time of day on the day that the clocks go back', () => {
		inNewYork()

		// 2026-11-01 is the change back to standard time in New York.
		const at = (date: number) => new Date(2026, 9, date, 23, 15)

		const filled = fillLine([at(30), at(31)], 2) as Date[]

		expect(filled.map((date) => [date.getMonth(), date.getDate(), date.getHours()])).toEqual([
			[10, 1, 23],
			[10, 2, 23],
		])
	})
})
