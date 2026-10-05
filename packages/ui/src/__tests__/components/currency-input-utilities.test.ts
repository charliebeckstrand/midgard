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
		expect(isMeaningful('0', 0, '0', ',', '.', 2)).toBe(true)

		expect(isMeaningful('9', 3, '1239', ',', '.', 2)).toBe(true)
	})

	it('treats a minus sign at index 0 as meaningful', () => {
		expect(isMeaningful('-', 0, '-1', ',', '.', 2)).toBe(true)
	})

	it('treats the minus sign U+2212 at index 0 as meaningful, as formatEditing keeps it as "-"', () => {
		expect(isMeaningful('\u2212', 0, '\u22121', '.', ',', 2)).toBe(true)
	})

	// formatEditing keeps only a leading sign, so a sign after index 0 must not
	// move the caret.
	it.each([
		['-', ',', '.'],
		['\u2212', '.', ','],
	])('rejects the minus sign %s after index 0', (sign, group, decimal) => {
		expect(isMeaningful(sign, 1, `1${sign}234`, group, decimal, 2)).toBe(false)

		expect(isMeaningful(sign, 4, `1234${sign}`, group, decimal, 2)).toBe(false)
	})

	it('treats the configured decimal separator as meaningful', () => {
		expect(isMeaningful('.', 1, '1.5', ',', '.', 2)).toBe(true)

		expect(isMeaningful(',', 1, '1,5', '.', ',', 2)).toBe(true)
	})

	it('rejects group separators and other characters', () => {
		expect(isMeaningful(',', 1, '1,234', ',', '.', 2)).toBe(false)

		expect(isMeaningful(' ', 1, '1 234', ',', '.', 2)).toBe(false)
	})

	// formatEditing keeps the other mark only where it is the decimal, or where
	// a later digit can still decide it. The caret counts it only there.
	it.each([
		['the other mark before two digits', ',', 2, '12,50', ',', '.', 2],
		['the de-DE other mark before two digits', '.', 2, '12.50', '.', ',', 2],
		['a trailing other mark', ',', 2, '12,', ',', '.', 2],
		['the last other mark after a group mark', ',', 5, '1,234,5', ',', '.', 2],
	] as const)('counts %s', (_name, char, index, text, group, decimal, max) => {
		expect(isMeaningful(char, index, text, group, decimal, max)).toBe(true)
	})

	it.each([
		['an other mark before the last mark', ',', 1, '1,234,5', ',', '.', 2],
		['the other mark before three digits', ',', 1, '1,234', ',', '.', 4],
		['the other mark in a text with a locale decimal', ',', 2, '12,5.', ',', '.', 2],
		['the other mark at maxFractionDigits 0', ',', 2, '12,5', ',', '.', 0],
	] as const)('does not count %s', (_name, char, index, text, group, decimal, max) => {
		expect(isMeaningful(char, index, text, group, decimal, max)).toBe(false)
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
	// style writes U+00A0.
	it('groups the de-AT integer part with the currency-style group', () => {
		expect(formatEditing('1234,5', 'de-AT', ',', 2)).toBe('1.234,5')
	})

	// ICU data: the fr-CH currency group is not the same in each ICU version
	// (U+202F in ICU 77, "'" in a later version). Thus the case reads the group
	// from the currency style of the ICU that runs the test.
	it('groups the fr-CH integer part with the currency-style group', () => {
		const group = new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' })
			.formatToParts(1234)
			.find((part) => part.type === 'group')?.value

		expect(formatEditing('1234.5', 'fr-CH', '.', 2)).toBe(`1${group}234.5`)
	})

	it('keeps grouped digits ASCII in non-latn-default locales', () => {
		// ar-EG defaults to Arabic-Indic digits; the editing parser only reads
		// 0-9, so grouped output must stay latn (digits 0-9, no native separator).
		const formatted = formatEditing('1234567', 'ar-EG', '.', 2)

		expect(formatted).toMatch(/^[\d,]+$/)

		expect(parseEditing(formatted, ',', '.', 2)).toBe(1234567)
	})

	// A decimal keypad follows the region of the device, so it can offer only
	// the other mark. The other mark is the decimal only when the text holds no
	// locale decimal, it is the last mark, and 1 to maxFractionDigits digits
	// follow it. Else it is a group mark. The text keeps the typed mark.
	it.each([
		['keeps the en-US other mark before two digits', '12,50', 'en-US', '.', 2, '12,50'],
		['keeps the de-DE other mark before two digits', '12.50', 'de-DE', ',', 2, '12.50'],
		['keeps a trailing other mark for a later digit', '12,', 'en-US', '.', 2, '12,'],
		['keeps a leading other mark as "0,"', ',5', 'en-US', '.', 2, '0,5'],
		['groups the integer part before the other mark', '1234,5', 'en-US', '.', 2, '1,234,5'],
		['reads the other mark before three digits as a group', '1,234', 'en-US', '.', 2, '1,234'],
		[
			'reads the de-DE other mark before three digits as a group',
			'1.234',
			'de-DE',
			',',
			2,
			'1.234',
		],
		['reads the other mark before four digits as a group', '1,2345', 'en-US', '.', 4, '12,345'],
		['reads the other mark as a group with a locale decimal', '12,5.', 'en-US', '.', 2, '125.'],
		['reads the other mark as a group at maxFractionDigits 0', '12,5', 'en-US', '.', 0, '125'],
	] as const)('%s', (_name, input, locale, decimal, maxFractionDigits, expected) => {
		expect(formatEditing(input, locale, decimal, maxFractionDigits)).toBe(expected)
	})

	it('lets a later digit make the other mark a group', () => {
		const first = formatEditing('1,23', 'en-US', '.', 2)

		expect(first).toBe('1,23')

		expect(parseEditing(first, ',', '.', 2)).toBe(1.23)

		const next = formatEditing(`${first}4`, 'en-US', '.', 2)

		expect(next).toBe('1,234')

		expect(parseEditing(next, ',', '.', 2)).toBe(1234)
	})

	// ICU data: the fr-FR currency group is a space, so a "." is never a group
	// that the format writes. The case reads the group from the running ICU.
	it('keeps the fr-FR other mark before three digits at maxFractionDigits 3', () => {
		const group = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
			.formatToParts(1234)
			.find((part) => part.type === 'group')?.value

		const formatted = formatEditing('1234.567', 'fr-FR', ',', 3)

		expect(formatted).toBe(`1${group}234.567`)

		expect(parseEditing(formatted, group ?? '', ',', 3)).toBe(1234.567)
	})
})

describe('parseEditing', () => {
	it('parses a formatted number back into a JS number', () => {
		expect(parseEditing('1,234.56', ',', '.', 2)).toBe(1234.56)
	})

	it('parses a negative number', () => {
		expect(parseEditing('-12.5', ',', '.', 2)).toBe(-12.5)
	})

	it.each([
		['an empty string', ''],
		['a lone minus sign', '-'],
		['a lone decimal separator', '.'],
		['a lone other mark', ','],
	])('returns undefined for %s', (_name, input) => {
		expect(parseEditing(input, ',', '.', 2)).toBeUndefined()
	})

	it('handles a comma decimal separator', () => {
		expect(parseEditing('1.234,5', '.', ',', 2)).toBe(1234.5)
	})

	// `toBe` compares with `Object.is`, which does not make -0 equal to 0. Intl
	// writes the sign of -0, and the display then shows "-0.00".
	it.each([
		['a negative zero', '-0'],
		['a negative zero with a fraction', '-0.00'],
		['a negative zero with no integer digit', '-.0'],
	])('returns 0, not -0, for %s', (_name, input) => {
		expect(parseEditing(input, ',', '.', 2)).toBe(0)
	})

	// The other mark is the decimal only when the text holds no locale decimal,
	// it is the last mark, and 1 to maxFractionDigits digits follow it. Else it
	// is a group mark.
	it.each([
		['the en-US other mark before two digits', '12,50', ',', '.', 2, 12.5],
		['the de-DE other mark before two digits', '12.50', '.', ',', 2, 12.5],
		['a negative amount with the other mark', '-12,5', ',', '.', 2, -12.5],
		['the last other mark after a group mark', '1,234,5', ',', '.', 2, 1234.5],
		['a trailing other mark', '12,', ',', '.', 2, 12],
		['the en-US other mark before three digits', '1,234', ',', '.', 2, 1234],
		['the de-DE other mark before three digits', '1.234', '.', ',', 2, 1234],
		['the other mark in a text with a locale decimal', '1,23.4', ',', '.', 2, 123.4],
		['the other mark at maxFractionDigits 0', '12,5', ',', '.', 0, 125],
		// The format writes the en-US group "," before three digits, and a typed
		// digit at the end then gives four.
		['the group mark before three digits at maxFractionDigits 4', '1,234', ',', '.', 4, 1234],
		['the group mark before four digits at maxFractionDigits 4', '1,2345', ',', '.', 4, 12345],
	] as const)('reads %s', (_name, input, group, decimal, maxFractionDigits, expected) => {
		expect(parseEditing(input, group, decimal, maxFractionDigits)).toBe(expected)
	})
})
