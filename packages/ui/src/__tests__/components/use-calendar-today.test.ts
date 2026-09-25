import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCalendarToday } from '../../components/calendar/use-calendar-today'

/** Tells the page that the reader shows it again, as a browser does for a tab. */
function showPage() {
	act(() => {
		document.dispatchEvent(new Event('visibilitychange'))
	})
}

/** Advances the fake clock and lets the resulting commit settle. */
function advance(ms: number) {
	act(() => {
		vi.advanceTimersByTime(ms)
	})
}

const HOUR = 3_600_000

// The suite pins the zone to UTC, so local midnight is 00:00 UTC.
beforeEach(() => {
	vi.useFakeTimers()

	vi.setSystemTime(new Date(2025, 5, 15, 12))
})

afterEach(() => {
	vi.useRealTimers()
})

describe('useCalendarToday', () => {
	it('reads the day in the first client render', () => {
		const { result } = renderHook(() => useCalendarToday())

		expect(result.current?.getDate()).toBe(15)
	})

	it('keeps one Date for the whole day', () => {
		const { result, rerender } = renderHook(() => useCalendarToday())

		const first = result.current

		rerender()

		advance(11 * HOUR)

		showPage()

		expect(result.current).toBe(first)
	})

	it('moves to the new day at local midnight', () => {
		const { result } = renderHook(() => useCalendarToday())

		advance(12 * HOUR - 1)

		expect(result.current?.getDate()).toBe(15)

		advance(1)

		expect(result.current?.getDate()).toBe(16)

		// The new day sets the timer for the midnight after it.
		advance(24 * HOUR)

		expect(result.current?.getDate()).toBe(17)
	})

	it('reads the clock when the page shows again after a missed midnight', () => {
		const { result } = renderHook(() => useCalendarToday())

		// The system clock moves, and no timer fires, as in a hidden tab.
		vi.setSystemTime(new Date(2025, 5, 16, 9))

		expect(result.current?.getDate()).toBe(15)

		showPage()

		expect(result.current?.getDate()).toBe(16)
	})

	it('sets a new timer when the timer fires before midnight', () => {
		const { result } = renderHook(() => useCalendarToday())

		// The system clock moves back one hour. The timer keeps its 12-hour
		// delay, so it fires at 23:00 on the same day.
		vi.setSystemTime(new Date(2025, 5, 15, 11))

		advance(12 * HOUR)

		expect(result.current?.getDate()).toBe(15)

		advance(HOUR)

		expect(result.current?.getDate()).toBe(16)
	})

	it('clears its timer on unmount', () => {
		const { unmount } = renderHook(() => useCalendarToday())

		expect(vi.getTimerCount()).toBe(1)

		unmount()

		expect(vi.getTimerCount()).toBe(0)
	})
})
