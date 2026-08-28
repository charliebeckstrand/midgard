import { CalendarDate } from '@internationalized/date'
import { describe, expect, it } from 'vitest'
import {
	firstOfMonth,
	fromCalendarDate,
	getCalendarDays,
	isBeforeDay,
	isBetween,
	isSameDay,
	toCalendarDate,
	toWeeks,
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

// The `Date(year, month, day)` constructor maps years 0–99 to 1900–1999;
// these guard that dates below year 100 convert with their year intact.
describe('fromCalendarDate', () => {
	it('renders a local-midnight Date for the calendar day', () => {
		const date = fromCalendarDate(new CalendarDate(2024, 6, 15))

		expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2024, 5, 15])

		expect([date.getHours(), date.getMinutes()]).toEqual([0, 0])
	})

	it('keeps years below 100 instead of mapping them to 19xx', () => {
		const date = fromCalendarDate(new CalendarDate(1, 1, 1))

		expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([1, 0, 1])
	})

	it('round-trips year 1 through toCalendarDate', () => {
		const original = new CalendarDate(1, 1, 1)

		expect(toCalendarDate(fromCalendarDate(original)).compare(original)).toBe(0)
	})
})

describe('firstOfMonth', () => {
	it('returns the first day of the month at local midnight', () => {
		const date = firstOfMonth(2024, 5)

		expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2024, 5, 1])
	})

	it('balances month -1 into December of the previous year', () => {
		const date = firstOfMonth(2024, -1)

		expect([date.getFullYear(), date.getMonth()]).toEqual([2023, 11])
	})

	it('balances month 12 into January of the next year', () => {
		const date = firstOfMonth(2024, 12)

		expect([date.getFullYear(), date.getMonth()]).toEqual([2025, 0])
	})

	it('keeps years below 100 instead of mapping them to 19xx', () => {
		expect(firstOfMonth(1, 0).getFullYear()).toBe(1)

		expect(firstOfMonth(99, 11).getFullYear()).toBe(99)
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

	it('keeps years below 100 instead of mapping them to 19xx', () => {
		const days = getCalendarDays(1, 0)

		expect(days).toHaveLength(31)

		expect(days[0]?.getFullYear()).toBe(1)

		expect(days.at(-1)?.getFullYear()).toBe(1)
	})
})

describe('toWeeks', () => {
	/** A month of `count` days, starting at the 1st of a fixed month. */
	const month = (count: number) =>
		Array.from({ length: count }, (_unused, at) => new Date(2026, 7, at + 1))

	it('pads the front to the column the 1st falls in', () => {
		const [first] = toWeeks(month(31), 3)

		expect(first?.slice(0, 2).map((cell) => cell.date)).toEqual([null, null])

		expect(first?.[2]?.date?.getDate()).toBe(1)
	})

	it('pads the last week out, so every row holds seven', () => {
		for (const [days, column] of [
			[31, 1],
			[31, 7],
			[28, 1],
			[30, 4],
		] as const) {
			for (const week of toWeeks(month(days), column)) expect(week).toHaveLength(7)
		}
	})

	it('holds every day of the month, in order and once', () => {
		const days = toWeeks(month(31), 5)
			.flat()
			.map((cell) => cell.date)
			.filter((date): date is Date => date !== null)

		expect(days).toHaveLength(31)

		expect(days.map((date) => date.getDate())).toEqual(
			Array.from({ length: 31 }, (_unused, at) => at + 1),
		)
	})

	// A padding cell carries its own key rather than borrowing its position, so a
	// month that changes shape does not rebuild the rows that did not move.
	it('gives every cell a key of its own', () => {
		const keys = toWeeks(month(30), 6)
			.flat()
			.map((cell) => cell.key)

		expect(new Set(keys).size).toBe(keys.length)
	})

	// A month starting on the first column and filling its last week needs no
	// padding at all.
	it('pads nothing where the month already fills its weeks', () => {
		const cells = toWeeks(month(28), 1).flat()

		expect(cells).toHaveLength(28)

		expect(cells.every((cell) => cell.date !== null)).toBe(true)
	})

	it('treats a column below one as no padding at all', () => {
		expect(toWeeks(month(7), 0).flat()).toHaveLength(7)
	})
})
