import { describe, expect, it } from 'vitest'
import {
	addDays,
	clampDate,
	endOfMonth,
	endOfYear,
	formatDate,
	formatRange,
	startOfDay,
	startOfMonth,
	startOfYear,
} from '../../components/date-picker/date-picker-utilities'

describe('formatDate', () => {
	it('returns a localized date string', () => {
		const result = formatDate(new Date(2024, 0, 15))

		expect(result).toBeTypeOf('string')

		expect(result.length).toBeGreaterThan(0)
	})
})

describe('formatRange', () => {
	it('joins start and end with an en dash', () => {
		const result = formatRange(new Date(2024, 0, 1), new Date(2024, 0, 10))

		expect(result).toContain(' – ')
	})
})

describe('startOfDay', () => {
	it('strips the time component', () => {
		const input = new Date(2024, 4, 15, 13, 45, 30, 100)

		const result = startOfDay(input)

		expect(result.getFullYear()).toBe(2024)

		expect(result.getMonth()).toBe(4)

		expect(result.getDate()).toBe(15)

		expect(result.getHours()).toBe(0)

		expect(result.getMinutes()).toBe(0)

		expect(result.getSeconds()).toBe(0)

		expect(result.getMilliseconds()).toBe(0)
	})
})

describe('addDays', () => {
	it('shifts the date forward by N days', () => {
		const result = addDays(new Date(2024, 0, 10), 5)

		expect(result.getDate()).toBe(15)
	})

	it('rolls into the next month when needed', () => {
		const result = addDays(new Date(2024, 0, 30), 5)

		expect(result.getMonth()).toBe(1)

		expect(result.getDate()).toBe(4)
	})

	it('rolls back into the previous month for negative amounts', () => {
		const result = addDays(new Date(2024, 1, 3), -5)

		expect(result.getMonth()).toBe(0)

		expect(result.getDate()).toBe(29)
	})
})

describe('clampDate', () => {
	it('returns the date unchanged when no bounds are provided', () => {
		const input = new Date(2024, 5, 15)

		const result = clampDate(input)

		expect(result.getTime()).toBe(startOfDay(input).getTime())
	})

	it('clamps to the minimum bound', () => {
		const result = clampDate(new Date(2024, 0, 1), new Date(2024, 0, 10))

		expect(result.getDate()).toBe(10)
	})

	it('clamps to the maximum bound', () => {
		const result = clampDate(new Date(2024, 0, 20), undefined, new Date(2024, 0, 10))

		expect(result.getDate()).toBe(10)
	})

	it('passes through dates within bounds', () => {
		const result = clampDate(new Date(2024, 0, 15), new Date(2024, 0, 1), new Date(2024, 0, 31))

		expect(result.getDate()).toBe(15)
	})
})

describe('startOfMonth', () => {
	it('returns local midnight on the first of the month', () => {
		expect(startOfMonth(new Date(2025, 5, 15, 9, 30))).toEqual(new Date(2025, 5, 1))
	})
})

describe('endOfMonth', () => {
	it('returns the last day of the month', () => {
		expect(endOfMonth(new Date(2025, 1, 10))).toEqual(new Date(2025, 1, 28))

		expect(endOfMonth(new Date(2024, 1, 10))).toEqual(new Date(2024, 1, 29))
	})
})

describe('startOfYear', () => {
	it('returns January 1st of the year', () => {
		expect(startOfYear(new Date(2025, 5, 15))).toEqual(new Date(2025, 0, 1))
	})
})

describe('endOfYear', () => {
	it('returns December 31st of the year', () => {
		expect(endOfYear(new Date(2025, 5, 15))).toEqual(new Date(2025, 11, 31))
	})
})
