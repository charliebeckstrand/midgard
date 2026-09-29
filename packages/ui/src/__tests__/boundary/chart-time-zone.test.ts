import { describe, expect, it, onTestFinished } from 'vitest'
import {
	dateCategoryFormat,
	parseInstant,
	timeCategory,
} from '../../modules/chart/engine/chart-time'

/**
 * The partial ISO forms of a date key, in a zone west of UTC. The suite pins
 * UTC, where local midnight and UTC midnight are the same instant. The shift
 * that these cases catch thus needs another zone.
 *
 * A worker thread keeps the zone that it started with, and a write to
 * `process.env.TZ` there has no effect. This suite sits in `boundary/`, which
 * the `integration` project runs on forks. A fork reads a new `TZ` at once.
 */

/** Moves the process to New York for the case, and back after it. */
function inNewYork() {
	const zone = process.env.TZ

	process.env.TZ = 'America/New_York'

	onTestFinished(() => {
		process.env.TZ = zone
	})

	// A case that runs in UTC passes on the defect, so it must fail here.
	expect(new Date(2026, 0, 1).getTimezoneOffset(), 'the zone change took no effect').toBe(300)
}

describe('chart-time partial ISO dates west of UTC', () => {
	it('reads YYYY-MM and YYYY as local midnight on the first day', () => {
		inNewYork()

		// `Date.parse` reads both as UTC midnight, the evening before in New York.
		expect(parseInstant('2026-01')).toBe(new Date(2026, 0, 1).getTime())

		expect(parseInstant('2026')).toBe(new Date(2026, 0, 1).getTime())
	})

	it('labels a YYYY-MM category axis on the first of each month', () => {
		inNewYork()

		const values = ['2026-01', '2026-02', '2026-03']

		const format = dateCategoryFormat(values, 2026, 'en-US')

		expect(values.map((value) => format?.(value))).toEqual(['01/01', '02/01', '03/01'])
	})

	it('reads a YYYY-MM tooltip date in its own month', () => {
		inNewYork()

		expect(timeCategory('en-US')('2026-01')).toBe('Jan 1, 2026')
	})
})
