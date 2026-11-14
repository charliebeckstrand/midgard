import { describe, expect, it, vi } from 'vitest'
import { getMonthStand, getWeekdayStands } from '../../components/calendar/calendar-utilities'
import { standDate } from '../../components/date-picker/date-picker-utilities'

/**
 * The skeleton text of a calendar day in a zone east of UTC. The suite pins
 * UTC, where local midnight and UTC midnight are the same instant. In Tokyo,
 * local midnight is the day before in UTC, so a skeleton that reads the parts
 * in UTC names the day before, and the browser and the server then disagree.
 *
 * A worker thread keeps the zone that it started with. This suite sits in
 * `boundary/`, which the `integration` project runs on forks, where a new `TZ`
 * takes effect at once.
 */

/** Moves the process to Tokyo for the case. The setup restores the zone after it. */
const inTokyo = vi.defineHelper(() => {
	vi.stubEnv('TZ', 'Asia/Tokyo')

	// A case that runs in UTC passes on the defect, so it must fail here.
	expect(new Date(2026, 0, 1).getTimezoneOffset(), 'the zone change took no effect').toBe(-540)
})

describe('date skeleton text east of UTC', () => {
	it('names the local day of a DatePicker value', () => {
		inTokyo()

		expect(standDate(new Date(2025, 5, 1))).toBe('6/1/2025')
	})

	it('names the local month and weekdays of a Calendar', () => {
		inTokyo()

		expect(getMonthStand(new Date(2025, 5, 1))).toBe('June 2025')

		expect(getWeekdayStands('en-US')).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
	})
})
