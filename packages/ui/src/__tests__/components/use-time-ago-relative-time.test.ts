import { renderHook } from '@testing-library/react'
import { describe, expect, vi } from 'vitest'
import {
	MIN_REFRESH_MS,
	resolveRefreshInterval,
	useTimeAgoRelativeTime,
} from '../../components/time-ago/use-time-ago-relative-time'
import {
	DAY,
	HOUR,
	MAX_TIMEOUT,
	MINUTE,
	MONTH,
	SECOND,
	WEEK,
	YEAR,
} from '../../utilities/time-units'
import { it, onFakeClock } from '../helpers/fake-clock'

const NOW = new Date('2026-05-19T12:00:00Z')

describe('useTimeAgoRelativeTime', () => {
	onFakeClock()

	it.beforeEach(({ clock }) => {
		clock.set(NOW)
	})

	it('returns valid=false and empty text for an unparsable date', () => {
		const { result } = renderHook(() => useTimeAgoRelativeTime({ value: 'not-a-date' }))

		expect(result.current.valid).toBe(false)

		expect(result.current.text).toBe('')
	})

	it.each<[string, number, RegExp]>([
		['seconds for differences below one minute', -30 * SECOND, /second|now/i],
		['minutes for differences below one hour', -5 * MINUTE, /minute/i],
		['hours for differences below one day', -2 * HOUR, /hour/i],
		['days for differences below one week', -3 * DAY, /day/i],
		['weeks for differences below one month', -2 * WEEK, /week/i],
		['months for differences below one year', -4 * MONTH, /month/i],
		['years for differences past one year', -2 * YEAR, /year/i],
		// A future date takes the same unit as a past one: only the sign differs.
		['a future date symmetrically by sign', 30 * MINUTE, /minute/i],
	])('formats %s', (_name, offset, expected) => {
		const then = new Date(NOW.getTime() + offset)

		const { result } = renderHook(() => useTimeAgoRelativeTime({ value: then }))

		expect(result.current.text).toMatch(expected)
	})

	it('uses the supplied custom formatter when provided', () => {
		const format = vi.fn(() => 'just now')

		const then = new Date(NOW.getTime() - 10 * SECOND)

		const { result } = renderHook(() => useTimeAgoRelativeTime({ value: then, format }))

		expect(format).toHaveBeenCalled()

		expect(result.current.text).toBe('just now')
	})

	it.each([
		['a numeric timestamp', NOW.getTime() - 30 * SECOND],
		['an ISO string', new Date(NOW.getTime() - 60 * SECOND).toISOString()],
	])('accepts %s', (_name, date) => {
		const { result } = renderHook(() => useTimeAgoRelativeTime({ value: date }))

		expect(result.current.valid).toBe(true)
	})

	it('honors an explicit numeric interval over the adaptive default', () => {
		const then = new Date(NOW.getTime() - 30 * SECOND)

		const setIntervalSpy = vi.spyOn(window, 'setInterval')

		renderHook(() => useTimeAgoRelativeTime({ value: then, interval: 1000 }))

		expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000)
	})

	it('uses adaptive interval steps when interval="auto"', () => {
		const setIntervalSpy = vi.spyOn(window, 'setInterval')

		// 3 days ago sits below the WEEK threshold, so the adaptive ladder picks the HOUR interval.
		renderHook(() => useTimeAgoRelativeTime({ value: new Date(NOW.getTime() - 3 * DAY) }))

		expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), HOUR)
	})

	it('skips the refresh interval when the date is invalid', () => {
		const setIntervalSpy = vi.spyOn(window, 'setInterval')

		renderHook(() => useTimeAgoRelativeTime({ value: 'still-not-a-date' }))

		expect(setIntervalSpy).not.toHaveBeenCalled()
	})

	it.for<[string, number]>([
		['Infinity', Number.POSITIVE_INFINITY],
		['a 30-day interval above the timer range', 30 * DAY],
	])(
		'does not tick within a few hundred ms for interval=%s',
		async ([_name, interval], { clock }) => {
			const format = vi.fn(() => 'x')

			renderHook(() =>
				useTimeAgoRelativeTime({ value: new Date(NOW.getTime() - SECOND), format, interval }),
			)

			const calls = format.mock.calls.length

			// One step per act: React batches every tick inside one act into one render.
			for (let step = 0; step < 10; step++) {
				await clock.advance(50)
			}

			expect(format).toHaveBeenCalledTimes(calls)
		},
	)
})

describe('resolveRefreshInterval', () => {
	it.each<[string, number | 'auto', number]>([
		['an in-range value as given', 1000, 1000],
		['a value below the floor up to the floor', 0, MIN_REFRESH_MS],
		['a negative value up to the floor', -5, MIN_REFRESH_MS],
		['a value above the timer range down to the maximum', 30 * DAY, MAX_TIMEOUT],
		['Infinity to the maximum', Number.POSITIVE_INFINITY, MAX_TIMEOUT],
		['NaN to the adaptive cadence', Number.NaN, HOUR],
		["'auto' to the adaptive cadence", 'auto', HOUR],
	])('resolves %s', (_name, interval, expected) => {
		// 3 days sits below the WEEK threshold, so the adaptive ladder picks HOUR.
		expect(resolveRefreshInterval(interval, 3 * DAY)).toBe(expected)
	})
})
