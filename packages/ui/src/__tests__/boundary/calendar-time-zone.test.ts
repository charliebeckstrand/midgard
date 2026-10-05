import { CalendarDate, getLocalTimeZone, resetLocalTimeZone } from '@internationalized/date'
import { describe, expect, it, onTestFinished } from 'vitest'
import {
	firstOfMonth,
	fromCalendarDate,
	getMonthLabels,
} from '../../components/calendar/calendar-utilities'

/**
 * The calendar days after the runtime zone moves west of UTC. The library
 * keeps the zone of its first read. When that zone is `UTC`, the library
 * gives UTC midnight, which is the evening before in the new zone.
 *
 * A worker thread keeps the zone that it started with, and a write to
 * `process.env.TZ` there has no effect. This suite sits in `boundary/`, which
 * the `integration` project runs on forks. A fork reads a new `TZ` at once.
 */

/** Gives the library a first read in UTC, then moves the process to New York for the case. */
function inNewYorkAfterUtcRead() {
	const zone = process.env.TZ

	onTestFinished(() => {
		process.env.TZ = zone

		resetLocalTimeZone()
	})

	resetLocalTimeZone()

	expect(getLocalTimeZone(), 'the first read of the library was not in UTC').toBe('UTC')

	process.env.TZ = 'America/New_York'

	// A case that runs in UTC passes on the defect, so it must fail here.
	expect(new Date(2026, 0, 1).getTimezoneOffset(), 'the zone change took no effect').toBe(300)
}

describe('calendar days after the runtime zone moves west of UTC', () => {
	it('builds local midnight for the calendar day', () => {
		inNewYorkAfterUtcRead()

		const date = fromCalendarDate(new CalendarDate(2025, 6, 1))

		expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2025, 5, 1])

		expect([date.getHours(), date.getMinutes()]).toEqual([0, 0])
	})

	it('keeps the first of the month in its own month', () => {
		inNewYorkAfterUtcRead()

		const date = firstOfMonth(2025, 5)

		expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2025, 5, 1])
	})

	it('starts the month labels on January', () => {
		inNewYorkAfterUtcRead()

		expect(getMonthLabels('en-US').slice(0, 3)).toEqual(['Jan', 'Feb', 'Mar'])
	})
})
