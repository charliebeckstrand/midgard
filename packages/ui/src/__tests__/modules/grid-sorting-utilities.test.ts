import { describe, expect, it } from 'vitest'
import {
	compareSmart,
	parseNumeric,
	type SmartSortField,
	sortRowsSmart,
} from '../../modules/grid/grid-sorting-utilities'

describe('parseNumeric', () => {
	it('parses plain numbers, comma grouping, currency, percent, and accounting negatives', () => {
		expect(parseNumeric(42)).toBe(42)

		expect(parseNumeric('1,234')).toBe(1234)

		expect(parseNumeric('$1,234.56')).toBe(1234.56)

		expect(parseNumeric('€90')).toBe(90)

		expect(parseNumeric('45%')).toBe(45)

		expect(parseNumeric('(1,234)')).toBe(-1234)

		expect(parseNumeric('-$50')).toBe(-50)
	})

	it('returns null for ambiguous or non-numeric values (kept as text)', () => {
		// Letters are never stripped: a trailing number does not make it a number.
		expect(parseNumeric('Item 10')).toBeNull()

		expect(parseNumeric('USD 90')).toBeNull()

		expect(parseNumeric('2024-01-05')).toBeNull()

		expect(parseNumeric('555-1234')).toBeNull()

		expect(parseNumeric('abc')).toBeNull()

		expect(parseNumeric('')).toBeNull()

		expect(parseNumeric(null)).toBeNull()

		expect(parseNumeric(Number.NaN)).toBeNull()
	})
})

describe('compareSmart', () => {
	const asc = (values: unknown[]) => [...values].sort(compareSmart)

	it('orders money and comma-grouped numbers numerically, not lexically', () => {
		expect(asc(['$999', '$1,234', '$90'])).toEqual(['$90', '$999', '$1,234'])
	})

	it('natural-sorts numbers embedded in strings', () => {
		expect(asc(['Item 10', 'Item 2', 'Item 1'])).toEqual(['Item 1', 'Item 2', 'Item 10'])
	})

	it('sinks empty and nullish values to the end', () => {
		expect(asc(['b', '', 'a', null])).toEqual(['a', 'b', '', null])
	})

	it('groups parsed numbers ahead of non-numbers in a mixed column', () => {
		expect(asc(['z', '5', 'a', '100'])).toEqual(['5', '100', 'a', 'z'])
	})

	it('compares dates and booleans by their natural order', () => {
		expect(compareSmart(new Date(2020, 0, 1), new Date(2021, 0, 1))).toBeLessThan(0)

		expect(compareSmart(true, false)).toBeGreaterThan(0)

		expect(compareSmart(false, true)).toBeLessThan(0)
	})

	it('treats equal values as equal', () => {
		expect(compareSmart('x', 'x')).toBe(0)

		expect(compareSmart(5, 5)).toBe(0)
	})
})

describe('sortRowsSmart', () => {
	type Row = { id: string; amount?: unknown; group?: unknown; flag?: boolean }

	const getKey = (row: Row) => row.id

	/** A smart field over a row key, ascending unless `descending`. */
	const field = (key: keyof Row, descending = false): SmartSortField<Row> => ({
		descending,
		accessor: (row) => row[key],
		sortFn: null,
	})

	/** The resulting id order. */
	const order = (rows: Row[], fields: SmartSortField<Row>[]) =>
		sortRowsSmart(rows, getKey, fields).rows.map((row) => row.id)

	it('orders one column by the smart comparator, not lexically', () => {
		const rows: Row[] = [
			{ id: 'a', amount: '$999' },
			{ id: 'b', amount: '$1,234' },
			{ id: 'c', amount: '$90' },
		]

		expect(order(rows, [field('amount')])).toEqual(['c', 'a', 'b'])
	})

	it('sinks empties last under both directions', () => {
		const rows: Row[] = [
			{ id: 'a', amount: 2 },
			{ id: 'empty', amount: null },
			{ id: 'b', amount: 1 },
		]

		expect(order(rows, [field('amount')])).toEqual(['b', 'a', 'empty'])

		// Descending flips the non-empty pair but keeps the empty at the end.
		expect(order(rows, [field('amount', true)])).toEqual(['a', 'b', 'empty'])
	})

	it('breaks ties by the next field in priority order', () => {
		const rows: Row[] = [
			{ id: 'a', group: 'x', amount: 2 },
			{ id: 'b', group: 'x', amount: 1 },
			{ id: 'c', group: 'y', amount: 5 },
		]

		expect(order(rows, [field('group'), field('amount', true)])).toEqual(['a', 'b', 'c'])
	})

	it('is stable — equal rows hold their original order', () => {
		const rows: Row[] = [
			{ id: 'a', group: 'same' },
			{ id: 'b', group: 'same' },
			{ id: 'c', group: 'same' },
		]

		expect(order(rows, [field('group')])).toEqual(['a', 'b', 'c'])
	})

	it('honors a custom sortFn, negated for descending', () => {
		const rows: Row[] = [{ id: 'a' }, { id: 'bb' }, { id: 'ccc' }]

		const byLength: SmartSortField<Row> = {
			descending: true,
			accessor: (row) => row.id,
			sortFn: (x, y) => x.id.length - y.id.length,
		}

		expect(order(rows, [byLength])).toEqual(['ccc', 'bb', 'a'])
	})

	it('keys each row at its original index, not its sorted position', () => {
		const rows: Row[] = [
			{ id: 'a', amount: 3 },
			{ id: 'b', amount: 1 },
			{ id: 'c', amount: 2 },
		]

		const keyedByIndex = (row: Row, index: number) => `${row.id}@${index}`

		const { keys } = sortRowsSmart(rows, keyedByIndex, [field('amount')])

		// Sorted order is b, c, a — but each key carries the row's *source* index.
		expect(keys).toEqual(['b@1', 'c@2', 'a@0'])
	})
})
