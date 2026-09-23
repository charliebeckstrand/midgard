// @vitest-environment node
import { fc, test } from '@fast-check/vitest'
import { describe, expect, it } from 'vitest'
import {
	compareSmart,
	computeSortOrder,
	materializeSort,
	parseNumeric,
	type SmartSortField,
	sortRowsSmart,
} from '../../modules/grid/engine/grid-sort/utilities'

describe('parseNumeric', () => {
	it('parses plain numbers, comma grouping, currency, percent, and accounting negatives', () => {
		expect(parseNumeric(42)).toBe(42)

		expect(parseNumeric('1,234')).toBe(1234)

		expect(parseNumeric('$1,234.56')).toBe(1234.56)

		expect(parseNumeric('€90')).toBe(90)

		expect(parseNumeric('45%')).toBe(45)

		expect(parseNumeric('(1,234)')).toBe(-1234)

		expect(parseNumeric('-$50')).toBe(-50)

		// A leading decimal point and surrounding whitespace still read as numbers —
		// the fast-reject gate runs after the trim and admits a `.`-led value.
		expect(parseNumeric('.5')).toBe(0.5)

		expect(parseNumeric('  42  ')).toBe(42)
	})

	it('returns null for ambiguous or non-numeric values (kept as text)', () => {
		// Letters are never stripped: a trailing number does not make it a number.
		expect(parseNumeric('Item 10')).toBeNull()

		expect(parseNumeric('USD 90')).toBeNull()

		expect(parseNumeric('2024-01-05')).toBeNull()

		expect(parseNumeric('555-1234')).toBeNull()

		expect(parseNumeric('abc')).toBeNull()

		// A value not starting like a number is fast-rejected (a text column's case).
		expect(parseNumeric('LAX')).toBeNull()

		expect(parseNumeric('N/A')).toBeNull()

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

	it('ranks dates ahead of text, so a mixed column cannot cycle', () => {
		// `String(date)` opens with the weekday: 2020 starts on a Wednesday and
		// 2021 on a Friday. A collator over those strings puts 'Mon' between the
		// two, against the order the dates keep by time.
		const earlier = new Date(2020, 0, 1)

		const later = new Date(2021, 0, 1)

		expect(asc(['Mon', later, earlier])).toEqual([earlier, later, 'Mon'])

		expect(compareSmart(earlier, 'Mon')).toBeLessThan(0)

		expect(compareSmart(later, 'Mon')).toBeLessThan(0)
	})

	it('keeps numbers ahead of dates', () => {
		expect(compareSmart(5, new Date(2020, 0, 1))).toBeLessThan(0)
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

	describe('computeSortOrder / materializeSort split', () => {
		it('composes to exactly sortRowsSmart', () => {
			const rows: Row[] = [
				{ id: 'a', amount: 3 },
				{ id: 'b', amount: 1 },
				{ id: 'c', amount: 2 },
			]

			const fields = [field('amount')]

			const composed = materializeSort(rows, computeSortOrder(rows, fields), getKey)

			expect(composed).toEqual(sortRowsSmart(rows, getKey, fields))
		})

		it('re-materializes a reused permutation with a different getKey', () => {
			const rows: Row[] = [
				{ id: 'a', amount: 3 },
				{ id: 'b', amount: 1 },
				{ id: 'c', amount: 2 },
			]

			// The permutation is computed once; the cache reuses it across renders
			// whose getKey identity differs. Both projections must key correctly off
			// the row's *original* index, never drift with the sorted position.
			const permutation = computeSortOrder(rows, [field('amount')])

			expect(materializeSort(rows, permutation, (row) => row.id).keys).toEqual(['b', 'c', 'a'])

			expect(materializeSort(rows, permutation, (row, index) => `${row.id}@${index}`).keys).toEqual(
				['b@1', 'c@2', 'a@0'],
			)
		})

		it('reversing direction is a distinct permutation, empties still last', () => {
			const rows: Row[] = [
				{ id: 'a', amount: 2 },
				{ id: 'empty', amount: null },
				{ id: 'b', amount: 1 },
			]

			const asc = computeSortOrder(rows, [field('amount')])

			const desc = computeSortOrder(rows, [field('amount', true)])

			expect(asc).toEqual([2, 0, 1])

			expect(desc).toEqual([0, 2, 1])
		})
	})
})

// The tables above hold the documented examples. The properties below read the
// same comparator and sorter over generated rows, so a stability break shrinks
// to the smallest set of rows that shows it.

/** A row the generated fields read: an original index, and two cells. */
type PropertyRow = { id: number; a: unknown; b: unknown }

// Values of every kind the comparator branches on, drawn from a small pool so
// ties are common. Stability is a claim about ties, and a wide pool never makes
// one.
const plainCell = () =>
	fc.oneof(
		fc.constantFrom(null, undefined, '', 'Item 2', 'Item 10', 'alpha', 'Beta'),
		fc.integer({ min: -20, max: 20 }),
		fc.integer({ min: -20, max: 20 }).map((amount) => `$${amount}`),
		fc.boolean(),
	)

const dateCell = () =>
	fc.oneof(
		fc.constantFrom(null, undefined, ''),
		fc.integer({ min: 0, max: 6 }).map((day) => new Date(2026, 0, 1 + day)),
	)

/**
 * Cells of any kind, mixed in one column.
 *
 * A mix of `Date` values and strings once made three values cycle: two dates
 * compared by time, and a date against a string fell to the collator over
 * `String(date)`. A date now ranks ahead of every other non-number, so the mix
 * is a true order too.
 */
const orderableRows = () =>
	rowsOf(fc.oneof(plainCell(), dateCell())).filter((rows) => rows.length > 0)

/** Rows built from a cell generator, each carrying its original index. */
function rowsOf(cell: fc.Arbitrary<unknown>) {
	return fc
		.array(fc.tuple(cell, cell), { minLength: 1, maxLength: 12 })
		.map((pairs) => pairs.map(([a, b], id) => ({ id, a, b }) as PropertyRow))
}

/** Cells of any kind, including the mix the ordering properties leave out. */
const anyRows = () => rowsOf(fc.oneof(plainCell(), dateCell()))

/** One smart field over a named cell. */
function field(key: 'a' | 'b', descending: boolean): SmartSortField<PropertyRow> {
	return { descending, accessor: (row) => row[key], sortFn: null }
}

// A key that reads both arguments. A key built from the row alone cannot tell
// the original index from the sorted position, which is the whole claim.
const rowKey = (row: PropertyRow, index: number) => `${row.id}@${index}`

/** Whether a cell sinks to the end, in the comparator's own reading. */
function isEmpty(value: unknown): boolean {
	return value == null || value === ''
}

describe('compareSmart · properties', () => {
	test.prop([plainCell()])('reads a value as equal to itself', (value) => {
		expect(compareSmart(value, value)).toBe(0)
	})

	// Compared as a boolean rather than through `toBe`, which parts `-0` from
	// `0` and reads a tie as a break.
	test.prop([plainCell(), plainCell()])('reverses its sign when the sides swap', (a, b) => {
		expect(Math.sign(compareSmart(a, b)) === -Math.sign(compareSmart(b, a))).toBe(true)
	})

	test.prop([orderableRows()])('orders a mixed column transitively', (rows) => {
		const cells = rows.map((row) => row.a)

		for (const a of cells) {
			for (const b of cells) {
				if (compareSmart(a, b) > 0) continue

				for (const c of cells) {
					if (compareSmart(b, c) > 0) continue

					expect(compareSmart(a, c)).toBeLessThanOrEqual(0)
				}
			}
		}
	})
})

describe('computeSortOrder · properties', () => {
	test.prop([anyRows(), fc.boolean()])('returns every row once', (rows, descending) => {
		const order = computeSortOrder(rows, [field('a', descending)])

		expect([...order].sort((x, y) => x - y)).toEqual(rows.map((_, index) => index))
	})

	// Stability is the tie-break the engine's `sortIndex` supplies: rows the
	// fields cannot part hold the order they arrived in.
	test.prop([anyRows(), fc.boolean()])('holds the order of tied rows', (rows, descending) => {
		const order = computeSortOrder(rows, [field('a', descending)])

		for (let at = 0; at + 1 < order.length; at++) {
			const before = (rows[order[at] as number] as PropertyRow).a

			const after = (rows[order[at + 1] as number] as PropertyRow).a

			if (compareSmart(before, after) === 0) {
				expect(order[at] as number).toBeLessThan(order[at + 1] as number)
			}
		}
	})

	test.prop([orderableRows()])('leaves an ascending run non-decreasing', (rows) => {
		const order = computeSortOrder(rows, [field('a', false)])

		for (let at = 0; at + 1 < order.length; at++) {
			const before = (rows[order[at] as number] as PropertyRow).a

			const after = (rows[order[at + 1] as number] as PropertyRow).a

			if (isEmpty(before) || isEmpty(after)) continue

			expect(compareSmart(before, after)).toBeLessThanOrEqual(0)
		}
	})

	test.prop([orderableRows()])('leaves a descending run non-increasing', (rows) => {
		const order = computeSortOrder(rows, [field('a', true)])

		for (let at = 0; at + 1 < order.length; at++) {
			const before = (rows[order[at] as number] as PropertyRow).a

			const after = (rows[order[at + 1] as number] as PropertyRow).a

			if (isEmpty(before) || isEmpty(after)) continue

			expect(compareSmart(before, after)).toBeGreaterThanOrEqual(0)
		}
	})

	test.prop([anyRows(), fc.boolean()])('sinks empties last either way', (rows, descending) => {
		const order = computeSortOrder(rows, [field('a', descending)])

		const empties = order.map((index) => isEmpty((rows[index] as PropertyRow).a))

		expect(empties).toEqual([...empties].sort((a, b) => Number(a) - Number(b)))
	})

	// The second field only parts rows the first cannot.
	test.prop([anyRows(), fc.boolean(), fc.boolean()])(
		'consults the second field on a tie alone',
		(rows, first, second) => {
			const order = computeSortOrder(rows, [field('a', first), field('b', second)])

			for (let at = 0; at + 1 < order.length; at++) {
				const before = rows[order[at] as number] as PropertyRow

				const after = rows[order[at + 1] as number] as PropertyRow

				if (compareSmart(before.a, after.a) !== 0) continue

				if (isEmpty(before.b) || isEmpty(after.b)) continue

				const ordered = compareSmart(before.b, after.b)

				expect(second ? ordered >= 0 : ordered <= 0).toBe(true)
			}
		},
	)
})

describe('sortRowsSmart · properties', () => {
	test.prop([anyRows(), fc.boolean()])(
		'is its permutation half followed by its materialize half',
		(rows, descending) => {
			const fields = [field('a', descending)]

			expect(sortRowsSmart(rows, rowKey, fields)).toEqual(
				materializeSort(rows, computeSortOrder(rows, fields), rowKey),
			)
		},
	)

	// A key is read at the row's original index, so it matches the engine path's
	// `rowKeys` whatever the sort did with the row.
	test.prop([anyRows(), fc.boolean()])('keys a row at its original index', (rows, descending) => {
		const fields = [field('a', descending)]

		const order = computeSortOrder(rows, fields)

		const { rows: sorted, keys } = sortRowsSmart(rows, rowKey, fields)

		order.forEach((index, at) => {
			expect(sorted[at]).toBe(rows[index])

			expect(keys[at]).toBe(rowKey(rows[index] as PropertyRow, index))
		})
	})

	test.prop([anyRows()])('leaves the rows it was handed untouched', (rows) => {
		const before = [...rows]

		sortRowsSmart(rows, rowKey, [field('a', false)])

		expect(rows).toEqual(before)
	})
})
