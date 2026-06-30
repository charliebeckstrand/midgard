import { describe, expect, it } from 'vitest'
import {
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

describe('formatEditing', () => {
	it('applies locale digit grouping to the integer part', () => {
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

	it('keeps grouped digits ASCII in non-latn-default locales', () => {
		// ar-EG defaults to Arabic-Indic digits; the editing parser only reads
		// 0-9, so grouped output must stay latn (digits 0-9, no native separator).
		const formatted = formatEditing('1234567', 'ar-EG', '.', 2)

		expect(formatted).toMatch(/^[\d,]+$/)

		expect(parseEditing(formatted, ',', '.')).toBe(1234567)
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
