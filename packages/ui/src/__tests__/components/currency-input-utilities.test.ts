import { describe, expect, it } from 'vitest'
import {
	countMeaningful,
	cursorForCount,
	escapeRegExp,
	formatEditing,
	isMeaningful,
	parseEditing,
} from '../../components/currency-input/currency-input-utilities'

describe('escapeRegExp', () => {
	it('escapes characters with regex meaning', () => {
		expect(escapeRegExp('.+*?^$' + '{}()|[]\\')).toBe('\\.\\+\\*\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\')
	})

	it('passes alphanumerics through unchanged', () => {
		expect(escapeRegExp('abc123')).toBe('abc123')
	})
})

describe('isMeaningful', () => {
	it('treats digits as meaningful', () => {
		expect(isMeaningful('0', '.')).toBe(true)

		expect(isMeaningful('9', '.')).toBe(true)
	})

	it('treats the minus sign as meaningful', () => {
		expect(isMeaningful('-', '.')).toBe(true)
	})

	it('treats the configured decimal separator as meaningful', () => {
		expect(isMeaningful('.', '.')).toBe(true)

		expect(isMeaningful(',', ',')).toBe(true)
	})

	it('rejects group separators and other characters', () => {
		expect(isMeaningful(',', '.')).toBe(false)

		expect(isMeaningful(' ', '.')).toBe(false)
	})
})

describe('countMeaningful', () => {
	it('counts meaningful characters up to a cursor', () => {
		expect(countMeaningful('1,234.56', 5, '.')).toBe(4) // 1, 2, 3, 4
	})

	it('clamps to the string length', () => {
		expect(countMeaningful('123', 99, '.')).toBe(3)
	})

	it('returns 0 when the cursor is at the start', () => {
		expect(countMeaningful('1,234.56', 0, '.')).toBe(0)
	})
})

describe('cursorForCount', () => {
	it('returns 0 when target is 0', () => {
		expect(cursorForCount('1,234.56', 0, '.')).toBe(0)
	})

	it('returns the index after the Nth meaningful character', () => {
		// "1,234.56" — 1 -> pos 1; 2 -> pos 3; 3 -> pos 4; 4 -> pos 5; '.' -> pos 6; 5 -> pos 7; 6 -> pos 8
		expect(cursorForCount('1,234.56', 4, '.')).toBe(5)
	})

	it('returns the string length when target exceeds meaningful count', () => {
		expect(cursorForCount('1,234.56', 99, '.')).toBe('1,234.56'.length)
	})
})

describe('formatEditing', () => {
	it('returns the raw integer when locale grouping is unavailable', () => {
		expect(formatEditing('1234567', 'en-US', '.', 2)).toBe('1,234,567')
	})

	it('preserves a leading minus sign', () => {
		expect(formatEditing('-1234', 'en-US', '.', 2)).toBe('-1,234')
	})

	it('preserves a trailing decimal point', () => {
		expect(formatEditing('1234.', 'en-US', '.', 2)).toBe('1,234.')
	})

	it('truncates the fractional part to maxFractionDigits', () => {
		expect(formatEditing('1.23456', 'en-US', '.', 2)).toBe('1.23')
	})

	it('does not append a fractional part when maxFractionDigits is 0', () => {
		expect(formatEditing('1.23', 'en-US', '.', 0)).toBe('1')
	})

	it('treats a leading decimal as "0."', () => {
		expect(formatEditing('.5', 'en-US', '.', 2)).toBe('0.5')
	})

	it('keeps only the first decimal point in input', () => {
		expect(formatEditing('1.2.3', 'en-US', '.', 2)).toBe('1.23')
	})

	it('strips leading zeros from the integer part', () => {
		expect(formatEditing('00012', 'en-US', '.', 2)).toBe('12')
	})

	it('strips non-meaningful characters', () => {
		expect(formatEditing('1a2b3', 'en-US', '.', 2)).toBe('123')
	})

	it('honors a comma decimal separator', () => {
		expect(formatEditing('1234,5', 'de-DE', ',', 2)).toMatch(/^1.234,5$/)
	})
})

describe('parseEditing', () => {
	it('parses a formatted number back into a JS number', () => {
		expect(parseEditing('1,234.56', ',', '.')).toBe(1234.56)
	})

	it('parses a negative number', () => {
		expect(parseEditing('-12.5', ',', '.')).toBe(-12.5)
	})

	it('returns undefined for an empty string', () => {
		expect(parseEditing('', ',', '.')).toBeUndefined()
	})

	it('returns undefined for a lone minus sign', () => {
		expect(parseEditing('-', ',', '.')).toBeUndefined()
	})

	it('returns undefined for a lone decimal separator', () => {
		expect(parseEditing('.', ',', '.')).toBeUndefined()
	})

	it('handles a comma decimal separator', () => {
		expect(parseEditing('1.234,5', '.', ',')).toBe(1234.5)
	})
})
