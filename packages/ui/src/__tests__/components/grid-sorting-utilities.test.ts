import { describe, expect, it } from 'vitest'
import { compareSmart, parseNumeric } from '../../modules/grid/grid-sorting-utilities'

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
