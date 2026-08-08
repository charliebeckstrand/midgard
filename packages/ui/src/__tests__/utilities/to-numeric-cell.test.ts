import { describe, expect, it } from 'vitest'
import { toNumericCell } from '../../utilities'

describe('toNumericCell', () => {
	it('passes real numbers through unchanged, non-finite included', () => {
		expect(toNumericCell(42)).toBe(42)

		expect(toNumericCell(0)).toBe(0)

		expect(toNumericCell(-3.5)).toBe(-3.5)

		expect(toNumericCell(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY)

		expect(Number.isNaN(toNumericCell(Number.NaN))).toBe(true)
	})

	it('parses non-blank numeric strings, trimming surrounding whitespace', () => {
		expect(toNumericCell('42')).toBe(42)

		expect(toNumericCell('  3.5  ')).toBe(3.5)
	})

	it('maps blanks and non-numeric values to NaN, not a finite 0', () => {
		// The reason the helper exists: a bare Number() reads '', null, false, and
		// [] as a finite 0, which buckets a no-value cell as a real zero.
		for (const blank of ['', '   ', null, undefined, false, true, [], {}, 'abc']) {
			expect(Number.isNaN(toNumericCell(blank))).toBe(true)
		}
	})
})
