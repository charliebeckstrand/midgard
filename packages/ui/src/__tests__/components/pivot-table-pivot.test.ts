// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	aggregate,
	aggregateAll,
	aggregateColumn,
	aggregateRow,
	groupValues,
	resolveAxis,
} from '../../components/pivot-table/pivot-table-pivot'

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

	it('drops null, empty-string, and other non-numeric cells instead of counting them as 0', () => {
		type NullableRow = { region: string; year: string; amount: number | null | string | boolean }

		const nullable: NullableRow[] = [
			{ region: 'NA', year: '2024', amount: 10 },
			{ region: 'NA', year: '2024', amount: null },
			{ region: 'NA', year: '2024', amount: '' },
			{ region: 'NA', year: '2024', amount: false },
		]

		const groups = groupValues(nullable, 'region', 'year', 'amount')

		// Number(null) / Number('') / Number(false) are each a finite 0 but must not
		// be bucketed; only the real 10 survives.
		expect(groups.get('NA')?.get('2024')).toEqual([10])
	})

	it('reads money, grouped, and accounting values as the grid does', () => {
		const money = [
			{ region: 'NA', year: '2024', amount: '$1,200' },
			{ region: 'NA', year: '2024', amount: '(50)' },
			{ region: 'NA', year: '2024', amount: '12%' },
		]

		expect(groupValues(money, 'region', 'year', 'amount').get('NA')?.get('2024')).toEqual([
			1200, -50, 12,
		])
	})
})

describe('aggregate', () => {
	it.each([
		['counts elements regardless of their values', [1, 2, 3], 'count', 3],
		['counts an empty input as 0', [], 'count', 0],
		['sums the values', [1, 2, 3], 'sum', 6],
		['averages the values', [2, 4, 6], 'avg', 4],
		['returns the min', [3, 1, 2], 'min', 1],
		['returns the max', [3, 1, 2], 'max', 3],
		['returns 0 for an empty sum', [], 'sum', 0],
		['returns 0 for an empty average', [], 'avg', 0],
	] as const)('%s', (_name, values, op, expected) => {
		expect(aggregate(values, op)).toBe(expected)
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

	it('aggregateAll collects a bucket larger than the engine argument limit', () => {
		// An argument spread of this bucket throws a RangeError under V8.
		const size = 2_000_000

		const oversized = new Map([['r', new Map([['c', new Array<number>(size).fill(1)]])]])

		expect(aggregateAll(oversized, 'sum')).toBe(size)
	})

	it('aggregateAll returns undefined for an empty groups map', () => {
		expect(aggregateAll(new Map(), 'sum')).toBeUndefined()
	})
})
