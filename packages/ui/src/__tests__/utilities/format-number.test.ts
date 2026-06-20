import { describe, expect, it } from 'vitest'
import { formatFraction, formatInteger } from '../../utilities/format-number'

// Assertions assume the en-US default locale, matching the existing Odometer
// corpus; a different runtime locale would change the grouping/decimal glyphs.
describe('formatInteger', () => {
	it('groups thousands', () => {
		expect(formatInteger(1234)).toBe('1,234')

		expect(formatInteger(1000000)).toBe('1,000,000')
	})

	it('formats zero and negatives', () => {
		expect(formatInteger(0)).toBe('0')

		expect(formatInteger(-1234)).toBe('-1,234')
	})

	// The bare `new Intl.NumberFormat()` keeps up to three fraction digits, so
	// despite its "no fraction digits" doc `formatInteger` does NOT round to an
	// integer. Pinned so adding `maximumFractionDigits: 0` is a conscious,
	// reviewed change rather than a silent regression in callers.
	it('does not strip fraction digits (documents current behavior)', () => {
		expect(formatInteger(1.5)).toBe('1.5')
	})
})

describe('formatFraction', () => {
	it('keeps up to two fraction digits and groups thousands', () => {
		expect(formatFraction(1234.5)).toBe('1,234.5')
	})

	it('rounds to two fraction digits', () => {
		expect(formatFraction(1.2345)).toBe('1.23')

		expect(formatFraction(1.236)).toBe('1.24')
	})

	it('omits trailing fraction digits for whole numbers', () => {
		expect(formatFraction(2)).toBe('2')
	})
})
