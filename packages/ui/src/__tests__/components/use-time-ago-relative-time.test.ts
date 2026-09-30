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
	// Unwind spies BEFORE uninstalling the clock. The setInterval spies below
	// are created while fake timers own the global, so the spy saves the FAKE
	// implementation as its original; restoring mocks after useRealTimers
	// would re-install a dead fake clock's setInterval onto window — and
	// `isolate: false` evaluates shared modules (React, RTL) once per worker,
	// against the first file's globals, so that dead fake then stalls waitFor
	// polling in every later file of the worker.
	vi.restoreAllMocks()

	vi.useRealTimers()
})

describe('useTimeAgoRelativeTime', () => {
	it('returns valid=false and empty text for an unparsable date', () => {
		const { result } = renderHook(() => useTimeAgoRelativeTime({ date: 'not-a-date' }))

		expect(result.current.valid).toBe(false)

		expect(result.current.text).toBe('')
	})

	it.each<[string, number, RegExp]>([
		['seconds for differences below one minute', -30 * SEC, /second|now/i],
		['minutes for differences below one hour', -5 * MIN, /minute/i],
		['hours for differences below one day', -2 * HOUR, /hour/i],
		['days for differences below one week', -3 * DAY, /day/i],
		['weeks for differences below one month', -2 * WEEK, /week/i],
		['months for differences below one year', -4 * MONTH, /month/i],
		['years for differences past one year', -2 * YEAR, /year/i],
		// A future date takes the same unit as a past one: only the sign differs.
		['a future date symmetrically by sign', 30 * MIN, /minute/i],
	])('formats %s', (_name, offset, expected) => {
		const then = new Date(NOW.getTime() + offset)

		const { result } = renderHook(() => useTimeAgoRelativeTime({ date: then }))

		expect(result.current.text).toMatch(expected)
	})

	it('uses the supplied custom formatter when provided', () => {
		const format = vi.fn(() => 'just now')

		const then = new Date(NOW.getTime() - 10 * SEC)

		const { result } = renderHook(() => useTimeAgoRelativeTime({ date: then, format }))

		expect(format).toHaveBeenCalled()

		expect(result.current.text).toBe('just now')
	})

	it.each([
		['a numeric timestamp', NOW.getTime() - 30 * SEC],
		['an ISO string', new Date(NOW.getTime() - 60 * SEC).toISOString()],
	])('accepts %s', (_name, date) => {
		const { result } = renderHook(() => useTimeAgoRelativeTime({ date }))

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

		// 3 days ago sits below the WEEK threshold, so the adaptive ladder picks the HOUR interval.
		renderHook(() => useTimeAgoRelativeTime({ date: new Date(NOW.getTime() - 3 * DAY) }))

		expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), HOUR)
	})

	it('skips the refresh interval when the date is invalid', () => {
		const setIntervalSpy = vi.spyOn(window, 'setInterval')

		renderHook(() => useTimeAgoRelativeTime({ date: 'still-not-a-date' }))

		expect(setIntervalSpy).not.toHaveBeenCalled()
	})
})
