// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { parseNumeric } from '../../utilities'

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

	it('returns null for a blank, a boolean, and a non-finite number, never a 0', () => {
		// A bare Number() reads '', null, false, and [] as a finite 0, which buckets
		// a no-value cell as a real zero.
		for (const blank of ['', '   ', null, undefined, false, true, [], {}]) {
			expect(parseNumeric(blank)).toBeNull()
		}

		expect(parseNumeric(Number.POSITIVE_INFINITY)).toBeNull()
	})
})
