// @vitest-environment node
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
	// ICU can put thin spaces around the dash, so the check reads any space as one.
	const range = (start: Date, end: Date, locale: string) =>
		formatRange(start, end, locale, { dateStyle: 'medium' }).replace(/\s/g, ' ')

	it('gives the shared month and year once, in the range form of the locale', () => {
		expect(range(new Date(2024, 0, 1), new Date(2024, 0, 10), 'en-US')).toBe('Jan 1 – 10, 2024')

		expect(range(new Date(2024, 0, 1), new Date(2024, 0, 10), 'de-DE')).toBe('01.–10.01.2024')
	})

	it('gives both full dates when the year changes', () => {
		expect(range(new Date(2024, 11, 30), new Date(2025, 0, 2), 'en-US')).toBe(
			'Dec 30, 2024 – Jan 2, 2025',
		)
	})

	it('gives one date for a range of one day', () => {
		expect(range(new Date(2024, 0, 1), new Date(2024, 0, 1), 'en-US')).toBe('Jan 1, 2024')
	})
})

describe('startOfDay', () => {
	it('strips the time component', () => {
		expect(startOfDay(new Date(2024, 4, 15, 13, 45, 30, 100))).toEqual(new Date(2024, 4, 15))
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
