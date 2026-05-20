import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	DAY,
	HOUR,
	MIN,
	MONTH,
	SEC,
	WEEK,
	YEAR,
} from '../../components/time-ago/time-ago-constants'
import { useTimeAgoRelativeTime } from '../../components/time-ago/use-time-ago-relative-time'

const NOW = new Date('2026-05-19T12:00:00Z')

beforeEach(() => {
	vi.useFakeTimers()

	vi.setSystemTime(NOW)
})

afterEach(() => {
	vi.useRealTimers()

	vi.restoreAllMocks()
})

describe('useTimeAgoRelativeTime', () => {
	it('returns valid=false and empty text for an unparsable date', () => {
		const { result } = renderHook(() => useTimeAgoRelativeTime({ date: 'not-a-date' }))

		expect(result.current.valid).toBe(false)

		expect(result.current.text).toBe('')
	})

	it('formats seconds for differences below one minute', () => {
		const then = new Date(NOW.getTime() - 30 * SEC)

		const { result } = renderHook(() => useTimeAgoRelativeTime({ date: then }))

		expect(result.current.text).toMatch(/second|now/i)
	})

	it('formats minutes for differences below one hour', () => {
		const then = new Date(NOW.getTime() - 5 * MIN)

		const { result } = renderHook(() => useTimeAgoRelativeTime({ date: then }))

		expect(result.current.text).toMatch(/minute/i)
	})

	it('formats hours for differences below one day', () => {
		const then = new Date(NOW.getTime() - 2 * HOUR)

		const { result } = renderHook(() => useTimeAgoRelativeTime({ date: then }))

		expect(result.current.text).toMatch(/hour/i)
	})

	it('formats days for differences below one week', () => {
		const then = new Date(NOW.getTime() - 3 * DAY)

		const { result } = renderHook(() => useTimeAgoRelativeTime({ date: then }))

		expect(result.current.text).toMatch(/day/i)
	})

	it('formats weeks for differences below one month', () => {
		const then = new Date(NOW.getTime() - 2 * WEEK)

		const { result } = renderHook(() => useTimeAgoRelativeTime({ date: then }))

		expect(result.current.text).toMatch(/week/i)
	})

	it('formats months for differences below one year', () => {
		const then = new Date(NOW.getTime() - 4 * MONTH)

		const { result } = renderHook(() => useTimeAgoRelativeTime({ date: then }))

		expect(result.current.text).toMatch(/month/i)
	})

	it('formats years for differences past one year', () => {
		const then = new Date(NOW.getTime() - 2 * YEAR)

		const { result } = renderHook(() => useTimeAgoRelativeTime({ date: then }))

		expect(result.current.text).toMatch(/year/i)
	})

	it('uses the supplied custom formatter when provided', () => {
		const format = vi.fn(() => 'just now')

		const then = new Date(NOW.getTime() - 10 * SEC)

		const { result } = renderHook(() => useTimeAgoRelativeTime({ date: then, format }))

		expect(format).toHaveBeenCalled()

		expect(result.current.text).toBe('just now')
	})

	it('accepts a numeric timestamp', () => {
		const { result } = renderHook(() => useTimeAgoRelativeTime({ date: NOW.getTime() - 30 * SEC }))

		expect(result.current.valid).toBe(true)
	})

	it('accepts an ISO string', () => {
		const { result } = renderHook(() =>
			useTimeAgoRelativeTime({ date: new Date(NOW.getTime() - 60 * SEC).toISOString() }),
		)

		expect(result.current.valid).toBe(true)
	})

	it('honors an explicit numeric interval over the adaptive default', () => {
		const then = new Date(NOW.getTime() - 30 * SEC)

		const setIntervalSpy = vi.spyOn(window, 'setInterval')

		renderHook(() => useTimeAgoRelativeTime({ date: then, interval: 1000 }))

		expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000)
	})

	it('uses adaptive interval steps when interval="auto"', () => {
		const setIntervalSpy = vi.spyOn(window, 'setInterval')

		// 1 week ago should pick the HOUR interval per the adaptive ladder.
		renderHook(() => useTimeAgoRelativeTime({ date: new Date(NOW.getTime() - 3 * DAY) }))

		expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), HOUR)
	})

	it('handles future dates symmetrically by sign', () => {
		const then = new Date(NOW.getTime() + 30 * MIN)

		const { result } = renderHook(() => useTimeAgoRelativeTime({ date: then }))

		expect(result.current.text).toMatch(/minute/i)
	})

	it('skips the refresh interval when the date is invalid', () => {
		const setIntervalSpy = vi.spyOn(window, 'setInterval')

		renderHook(() => useTimeAgoRelativeTime({ date: 'still-not-a-date' }))

		expect(setIntervalSpy).not.toHaveBeenCalled()
	})
})
