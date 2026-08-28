import { describe, expect, it } from 'vitest'
import {
	addMonths,
	isMonth,
	monthStart,
	nextWeek,
	previousWeek,
	toMonth,
	weekDays,
	weekStart,
} from '../../utilities/rota-week'

describe('weekStart', () => {
	// 2026-08-17 is a Monday.
	it('answers with the day itself for a Monday', () => {
		expect(weekStart('2026-08-17')).toBe('2026-08-17')
	})

	it('walks back to the Monday for every other day of that week', () => {
		for (const day of ['2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21', '2026-08-22']) {
			expect(weekStart(day)).toBe('2026-08-17')
		}
	})

	// The one the naive arithmetic gets wrong: `getDay` is 0 for Sunday, so a
	// Sunday is six days into its week rather than one day before the next.
	it('reads a Sunday as the end of its week, not the start of the next', () => {
		expect(weekStart('2026-08-23')).toBe('2026-08-17')
	})

	it('crosses a month boundary', () => {
		expect(weekStart('2026-09-02')).toBe('2026-08-31')
	})

	it('crosses a year boundary', () => {
		expect(weekStart('2027-01-01')).toBe('2026-12-28')
	})
})

describe('weekDays', () => {
	it('answers with seven days, in order, from the day given', () => {
		expect(weekDays('2026-08-17')).toEqual([
			'2026-08-17',
			'2026-08-18',
			'2026-08-19',
			'2026-08-20',
			'2026-08-21',
			'2026-08-22',
			'2026-08-23',
		])
	})

	it('runs across a month end', () => {
		expect(weekDays('2026-08-31').slice(0, 2)).toEqual(['2026-08-31', '2026-09-01'])
	})
})

describe('previousWeek and nextWeek', () => {
	it('step a whole week either way', () => {
		expect(nextWeek('2026-08-17')).toBe('2026-08-24')

		expect(previousWeek('2026-08-17')).toBe('2026-08-10')
	})

	it('undo one another', () => {
		expect(previousWeek(nextWeek('2026-08-17'))).toBe('2026-08-17')
	})
})

describe('toMonth and monthStart', () => {
	it('read a day’s month and the month’s first day', () => {
		expect(toMonth('2026-08-17')).toBe('2026-08')

		expect(monthStart('2026-08')).toBe('2026-08-01')
	})
})

describe('addMonths', () => {
	it('steps a month either way', () => {
		expect(addMonths('2026-08', 1)).toBe('2026-09')

		expect(addMonths('2026-08', -1)).toBe('2026-07')
	})

	it('crosses a year boundary', () => {
		expect(addMonths('2026-12', 1)).toBe('2027-01')

		expect(addMonths('2026-01', -1)).toBe('2025-12')
	})

	// Built off the 1st, so a step out of a 31-day month never lands two months
	// on — which is what `setMonth` does to the 31st of January.
	it('lands in the month it was aimed at, whatever the month’s length', () => {
		expect(addMonths('2026-01', 1)).toBe('2026-02')

		expect(addMonths('2026-03', -1)).toBe('2026-02')
	})
})

describe('isMonth', () => {
	it('takes a well-formed month', () => {
		expect(isMonth('2026-08')).toBe(true)

		expect(isMonth('2026-12')).toBe(true)
	})

	it('refuses anything else', () => {
		for (const value of ['2026-13', '2026-00', '2026-8', '2026', '2026-08-17', 202608, null]) {
			expect(isMonth(value)).toBe(false)
		}
	})
})
