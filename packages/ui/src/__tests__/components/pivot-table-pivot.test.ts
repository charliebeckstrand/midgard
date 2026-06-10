import { describe, expect, it } from 'vitest'
import {
	aggregate,
	aggregateAll,
	aggregateColumn,
	aggregateRow,
	defaultFormat,
	groupValues,
	resolveAxis,
} from '../../components/pivot-table/pivot-table-pivot'

describe('defaultFormat', () => {
	it('formats integers without decimals', () => {
		expect(defaultFormat(1000)).toBe('1,000')
	})

	it('formats fractions with up to two decimals', () => {
		expect(defaultFormat(1.2345)).toBe('1.23')
	})
})

describe('resolveAxis', () => {
	type Row = { region: string; year: string }

	const data: Row[] = [
		{ region: 'NA', year: '2024' },
		{ region: 'EU', year: '2024' },
		{ region: 'NA', year: '2025' },
	]

	it('returns unique values from the data when no explicit axis is supplied', () => {
		expect(resolveAxis(data, 'region', undefined)).toEqual(['NA', 'EU'])
	})

	it('honors an explicit axis order and appends missing data-derived values after', () => {
		expect(resolveAxis(data, 'region', ['EU', 'APAC'])).toEqual(['EU', 'APAC', 'NA'])
	})

	it('deduplicates within the explicit axis list', () => {
		expect(resolveAxis(data, 'region', ['NA', 'NA', 'EU'])).toEqual(['NA', 'EU'])
	})
})

describe('groupValues', () => {
	type Row = { region: string; year: string; amount: number | string }

	const data: Row[] = [
		{ region: 'NA', year: '2024', amount: 10 },
		{ region: 'NA', year: '2024', amount: 20 },
		{ region: 'EU', year: '2024', amount: 5 },
		{ region: 'NA', year: '2025', amount: '15' },
		{ region: 'NA', year: '2024', amount: 'not-a-number' },
	]

	it('buckets values by (rowKey, columnKey) and coerces numeric strings', () => {
		const groups = groupValues(data, 'region', 'year', 'amount')

		expect(groups.get('NA')?.get('2024')).toEqual([10, 20])

		expect(groups.get('EU')?.get('2024')).toEqual([5])

		expect(groups.get('NA')?.get('2025')).toEqual([15])
	})

	it('skips non-finite values', () => {
		const groups = groupValues(data, 'region', 'year', 'amount')

		// 'not-a-number' becomes NaN and is filtered before bucketing.
		expect(groups.get('NA')?.get('2024')?.length).toBe(2)
	})
})

describe('aggregate', () => {
	it('counts elements regardless of their values', () => {
		expect(aggregate([1, 2, 3], 'count')).toBe(3)

		expect(aggregate([], 'count')).toBe(0)
	})

	it('sums the values', () => {
		expect(aggregate([1, 2, 3], 'sum')).toBe(6)
	})

	it('averages the values', () => {
		expect(aggregate([2, 4, 6], 'avg')).toBe(4)
	})

	it('returns the min', () => {
		expect(aggregate([3, 1, 2], 'min')).toBe(1)
	})

	it('returns the max', () => {
		expect(aggregate([3, 1, 2], 'max')).toBe(3)
	})

	it('returns 0 for an empty input on any non-count op', () => {
		expect(aggregate([], 'sum')).toBe(0)

		expect(aggregate([], 'avg')).toBe(0)
	})
})

describe('aggregateRow / aggregateColumn / aggregateAll', () => {
	const groups = new Map([
		[
			'NA',
			new Map([
				['2024', [10, 20]],
				['2025', [15]],
			]),
		],
		['EU', new Map([['2024', [5]]])],
	])

	it('aggregateRow sums across the chosen columns', () => {
		expect(aggregateRow(groups, 'NA', ['2024', '2025'], 'sum')).toBe(45)
	})

	it('aggregateRow returns undefined when no buckets contribute', () => {
		expect(aggregateRow(groups, 'NA', ['2099'], 'sum')).toBeUndefined()
	})

	it('aggregateColumn sums down the chosen rows', () => {
		expect(aggregateColumn(groups, ['NA', 'EU'], '2024', 'sum')).toBe(35)
	})

	it('aggregateColumn returns undefined when no buckets contribute', () => {
		expect(aggregateColumn(groups, ['NA', 'EU'], '2099', 'sum')).toBeUndefined()
	})

	it('aggregateAll combines every bucket', () => {
		expect(aggregateAll(groups, 'sum')).toBe(50)
	})

	it('aggregateAll returns undefined for an empty groups map', () => {
		expect(aggregateAll(new Map(), 'sum')).toBeUndefined()
	})
})
