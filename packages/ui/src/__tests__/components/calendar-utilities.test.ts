import { describe, expect, it } from 'vitest'
import {
	getCalendarDays,
	isBeforeDay,
	isBetween,
	isSameDay,
} from '../../components/calendar/calendar-utilities'

describe('isSameDay', () => {
	it('returns true for two Date instances representing the same calendar day', () => {
		expect(isSameDay(new Date(2024, 5, 15, 9, 0), new Date(2024, 5, 15, 23, 59))).toBe(true)
	})

	it('returns false when the day differs', () => {
		expect(isSameDay(new Date(2024, 5, 15), new Date(2024, 5, 16))).toBe(false)
	})

	it('returns false when the month differs', () => {
		expect(isSameDay(new Date(2024, 5, 15), new Date(2024, 6, 15))).toBe(false)
	})

	it('returns false when the year differs', () => {
		expect(isSameDay(new Date(2024, 5, 15), new Date(2025, 5, 15))).toBe(false)
	})
})

describe('isBeforeDay', () => {
	it('returns true when the year is earlier', () => {
		expect(isBeforeDay(new Date(2023, 11, 31), new Date(2024, 0, 1))).toBe(true)
	})

	it('returns false when the year is later', () => {
		expect(isBeforeDay(new Date(2024, 0, 1), new Date(2023, 11, 31))).toBe(false)
	})

	it('returns true when the month is earlier in the same year', () => {
		expect(isBeforeDay(new Date(2024, 4, 30), new Date(2024, 5, 1))).toBe(true)
	})

	it('returns true when the day is earlier in the same month', () => {
		expect(isBeforeDay(new Date(2024, 5, 10), new Date(2024, 5, 11))).toBe(true)
	})

	it('returns false for the same calendar day', () => {
		expect(isBeforeDay(new Date(2024, 5, 10, 0, 0), new Date(2024, 5, 10, 23, 59))).toBe(false)
	})
})

describe('isBetween', () => {
	it('returns true when the date sits strictly inside the range', () => {
		expect(isBetween(new Date(2024, 5, 10), new Date(2024, 5, 1), new Date(2024, 5, 20))).toBe(true)
	})

	it('returns false at the start boundary', () => {
		expect(isBetween(new Date(2024, 5, 1), new Date(2024, 5, 1), new Date(2024, 5, 20))).toBe(false)
	})

	it('returns false at the end boundary', () => {
		expect(isBetween(new Date(2024, 5, 20), new Date(2024, 5, 1), new Date(2024, 5, 20))).toBe(
			false,
		)
	})

	it('returns false when the date is outside the range', () => {
		expect(isBetween(new Date(2024, 4, 30), new Date(2024, 5, 1), new Date(2024, 5, 20))).toBe(
			false,
		)
	})

	it('handles a reversed range', () => {
		expect(isBetween(new Date(2024, 5, 10), new Date(2024, 5, 20), new Date(2024, 5, 1))).toBe(true)
	})
})

describe('getCalendarDays', () => {
	it('returns every day in a 30-day month', () => {
		const days = getCalendarDays(2024, 8) // September 2024

		expect(days).toHaveLength(30)
		expect(days[0]?.getDate()).toBe(1)
		expect(days.at(-1)?.getDate()).toBe(30)
	})

	it('returns 31 days for a 31-day month', () => {
		expect(getCalendarDays(2024, 0)).toHaveLength(31) // January
	})

	it('returns 29 days in February of a leap year', () => {
		expect(getCalendarDays(2024, 1)).toHaveLength(29)
	})

	it('returns 28 days in February of a non-leap year', () => {
		expect(getCalendarDays(2023, 1)).toHaveLength(28)
	})

	it('returns Date objects aligned to the requested year and month', () => {
		const [first] = getCalendarDays(2024, 5)

		expect(first?.getFullYear()).toBe(2024)
		expect(first?.getMonth()).toBe(5)
	})
})
