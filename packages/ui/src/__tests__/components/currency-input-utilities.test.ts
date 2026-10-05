// @vitest-environment node
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

	it('treats the minus sign U+2212 as meaningful, as formatEditing keeps it as "-"', () => {
		expect(isMeaningful('\u2212', ',')).toBe(true)
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
	it.each([
		[
			'keeps every digit of an integer run past 2^53',
			'12345678901234567',
			2,
			'12,345,678,901,234,567',
		],
		['applies locale digit grouping to the integer part', '1234567', 2, '1,234,567'],
		['preserves a leading minus sign', '-1234', 2, '-1,234'],
		['preserves a trailing decimal point', '1234.', 2, '1,234.'],
		['truncates the fractional part to maxFractionDigits', '1.23456', 2, '1.23'],
		['does not append a fractional part when maxFractionDigits is 0', '1.23', 0, '1'],
		['treats a leading decimal as "0."', '.5', 2, '0.5'],
		['keeps only the first decimal point in input', '1.2.3', 2, '1.23'],
		['strips leading zeros from the integer part', '00012', 2, '12'],
		['strips non-meaningful characters', '1a2b3', 2, '123'],
	] as const)('%s', (_name, input, maxFractionDigits, expected) => {
		expect(formatEditing(input, 'en-US', '.', maxFractionDigits)).toBe(expected)
	})

	it('honors a comma decimal separator', () => {
		expect(formatEditing('1234,5', 'de-DE', ',', 2)).toMatch(/^1.234,5$/)
	})

	it('maps the minus sign U+2212 to "-"', () => {
		// ICU data: sv-SE writes U+2212 for minus.
		expect(formatEditing('\u22121234,5', 'sv-SE', ',', 2)).toBe('-1\u00A0234,5')
	})

	// ICU data: the currency style of de-AT writes the group "." and the decimal
	// style writes U+00A0. fr-CH writes U+202F in both styles.
	it.each([
		['de-AT', '1234,5', ',', '1.234,5'],
		['fr-CH', '1234.5', '.', '1\u202F234.5'],
	] as const)(
		'groups the %s integer part with the currency-style group',
		(locale, raw, decimal, expected) => {
			expect(formatEditing(raw, locale, decimal, 2)).toBe(expected)
		},
	)

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

	it.each([
		['an empty string', ''],
		['a lone minus sign', '-'],
		['a lone decimal separator', '.'],
	])('returns undefined for %s', (_name, input) => {
		expect(parseEditing(input, ',', '.')).toBeUndefined()
	})

	it('handles a comma decimal separator', () => {
		expect(parseEditing('1.234,5', '.', ',')).toBe(1234.5)
	})

	// `toBe` compares with `Object.is`, which does not make -0 equal to 0. Intl
	// writes the sign of -0, and the display then shows "-0.00".
	it.each([
		['a negative zero', '-0'],
		['a negative zero with a fraction', '-0.00'],
		['a negative zero with no integer digit', '-.0'],
	])('returns 0, not -0, for %s', (_name, input) => {
		expect(parseEditing(input, ',', '.')).toBe(0)
	})
})
