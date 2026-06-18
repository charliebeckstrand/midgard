import { describe, expect, it } from 'vitest'

import {
	type DatePickerPeriodValue,
	isPeriodEmpty,
	normalizeYears,
	periodChips,
	periodMonthLabels,
	quarterLabel,
	toggleInSet,
	togglePeriodFacet,
} from '../../components/date-picker/date-picker-period-utilities'

describe('date-picker-period-utilities', () => {
	describe('toggleInSet', () => {
		it('adds a missing value and keeps the set sorted', () => {
			expect(toggleInSet([1, 5], 3)).toEqual([1, 3, 5])
		})

		it('removes a present value', () => {
			expect(toggleInSet([1, 3, 5], 3)).toEqual([1, 5])
		})

		it('does not mutate the input', () => {
			const set = [2, 4]

			toggleInSet(set, 6)

			expect(set).toEqual([2, 4])
		})
	})

	describe('togglePeriodFacet', () => {
		it('toggles one facet and leaves the others intact', () => {
			const value: DatePickerPeriodValue = { years: [2025], quarters: [], months: [1] }

			expect(togglePeriodFacet(value, 'quarters', 2)).toEqual({
				years: [2025],
				quarters: [2],
				months: [1],
			})
		})

		it('treats a missing value as the empty selection', () => {
			expect(togglePeriodFacet(undefined, 'months', 3)).toEqual({
				years: [],
				quarters: [],
				months: [3],
			})
		})
	})

	describe('isPeriodEmpty', () => {
		it('is true for undefined and for all-empty arrays', () => {
			expect(isPeriodEmpty(undefined)).toBe(true)
			expect(isPeriodEmpty({ years: [], quarters: [], months: [] })).toBe(true)
		})

		it('is false when any facet has a value', () => {
			expect(isPeriodEmpty({ years: [], quarters: [4], months: [] })).toBe(false)
		})
	})

	describe('quarterLabel', () => {
		it('prefixes the quarter number with Q', () => {
			expect(quarterLabel(3)).toBe('Q3')
		})
	})

	describe('normalizeYears', () => {
		it('dedupes and sorts ascending regardless of input order', () => {
			expect(normalizeYears([2026, 2024, 2025, 2024])).toEqual([2024, 2025, 2026])
		})

		it('returns an empty array for no years', () => {
			expect(normalizeYears([])).toEqual([])
		})
	})

	describe('periodChips', () => {
		const months = periodMonthLabels('en-US')

		it('returns no chips for an empty value', () => {
			expect(periodChips(undefined, months)).toEqual([])
		})

		it('orders chips years, then quarters, then months with stable keys', () => {
			const chips = periodChips({ years: [2025], quarters: [2], months: [1, 3] }, months)

			expect(chips).toEqual([
				{ key: 'year-2025', label: '2025' },
				{ key: 'quarter-2', label: 'Q2' },
				{ key: 'month-1', label: 'Jan' },
				{ key: 'month-3', label: 'Mar' },
			])
		})
	})
})
