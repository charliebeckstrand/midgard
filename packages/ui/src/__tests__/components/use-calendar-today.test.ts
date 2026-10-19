import { act, renderHook } from '@testing-library/react'
import { describe, expect, vi } from 'vitest'
import { useCalendarToday } from '../../components/calendar/use-calendar-today'
import { it, onFakeClock } from '../helpers/fake-clock'

/** Tells the page that the reader shows it again, as a browser does for a tab. */
function showPage() {
	act(() => {
		document.dispatchEvent(new Event('visibilitychange'))
	})
}

const HOUR = 3_600_000

describe('useCalendarToday', () => {
	onFakeClock()

	// The suite pins the zone to UTC, so local midnight is 00:00 UTC.
	it.beforeEach(({ clock }) => {
		clock.set(new Date(2025, 5, 15, 12))
	})

	it('reads the day in the first client render', () => {
		const { result } = renderHook(() => useCalendarToday())

		expect(result.current?.getDate()).toBe(15)
	})

	it('keeps one Date for the whole day', async ({ clock }) => {
		const { result, rerender } = renderHook(() => useCalendarToday())

		const first = result.current

		rerender()

		await clock.advance(11 * HOUR)

		showPage()

		expect(result.current).toBe(first)
	})

	it('moves to the new day at local midnight', async ({ clock }) => {
		const { result } = renderHook(() => useCalendarToday())

		await clock.advance(12 * HOUR - 1)

		expect(result.current?.getDate()).toBe(15)

		await clock.advance(1)

		expect(result.current?.getDate()).toBe(16)

		// The new day sets the timer for the midnight after it.
		await clock.advance(24 * HOUR)

		expect(result.current?.getDate()).toBe(17)
	})

	it('reads the clock when the page shows again after a missed midnight', async ({ clock }) => {
		const { result } = renderHook(() => useCalendarToday())

		// The system clock moves, and no timer fires, as in a hidden tab.
		clock.set(new Date(2025, 5, 16, 9))

		expect(result.current?.getDate()).toBe(15)

		showPage()

		expect(result.current?.getDate()).toBe(16)
	})

	it('sets a new timer when the timer fires before midnight', async ({ clock }) => {
		const { result } = renderHook(() => useCalendarToday())

		// The system clock moves back one hour. The timer keeps its 12-hour
		// delay, so it fires at 23:00 on the same day.
		clock.set(new Date(2025, 5, 15, 11))

		await clock.advance(12 * HOUR)

		expect(result.current?.getDate()).toBe(15)

		await clock.advance(HOUR)

		expect(result.current?.getDate()).toBe(16)
	})

	it('clears its timer on unmount', () => {
		const { unmount } = renderHook(() => useCalendarToday())

		expect(vi.getTimerCount()).toBe(1)

		unmount()

		expect(vi.getTimerCount()).toBe(0)
	})
})
