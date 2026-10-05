import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
	formatEditing,
	parseEditing,
} from '../../components/currency-input/currency-input-utilities'
import { useCurrencyInputFormatting } from '../../components/currency-input/use-currency-input-formatting'

describe('useCurrencyInputFormatting', () => {
	it('defaults to USD with a leading symbol and dot/comma separators', () => {
		const { result } = renderHook(() => useCurrencyInputFormatting({ locale: 'en-US' }))

		expect(result.current.symbol).toBe('$')

		expect(result.current.symbolIsPrefix).toBe(true)

		expect(result.current.group).toBe(',')

		expect(result.current.decimal).toBe('.')
	})

	it('reports the currency’s maxFractionDigits', () => {
		// JPY uses 0 fraction digits.
		const { result } = renderHook(() =>
			useCurrencyInputFormatting({ locale: 'en-US', currency: 'JPY' }),
		)

		expect(result.current.maxFractionDigits).toBe(0)
	})

	it('honors an explicit precision override', () => {
		const { result } = renderHook(() =>
			useCurrencyInputFormatting({ locale: 'en-US', currency: 'USD', precision: 4 }),
		)

		expect(result.current.maxFractionDigits).toBe(4)
	})

	it('builds a display formatter that groups thousands and writes no symbol', () => {
		const { result } = renderHook(() => useCurrencyInputFormatting({ locale: 'en-US' }))

		expect(result.current.displayFormatter.format(1234567.89)).toBe('1,234,567.89')
	})

	it('renders ASCII digits for native-digit locales so the parser can read them back', () => {
		// ar-EG would render ١٢٣٤ by default; the editing parser only recognizes
		// 0-9, so a native-digit display wipes the value on the first edit.
		const { result } = renderHook(() =>
			useCurrencyInputFormatting({ locale: 'ar-EG', currency: 'EGP' }),
		)

		const display = result.current.displayFormatter.format(1234.56)

		expect(display).toMatch(/1/)

		expect(display).not.toMatch(/[٠-٩۰-۹]/)

		// The extracted separators match the display, whatever the locale uses.
		expect(display).toContain(result.current.decimal)
	})

	it('extracts comma-decimal locale separators (de-DE groups with dots)', () => {
		// formatToParts(0) emits no group part; the extraction must sample a
		// grouped value or de-DE silently inherits the en-US ',' group fallback
		// and parseEditing strips the user's decimal comma as a group separator.
		const { result } = renderHook(() =>
			useCurrencyInputFormatting({ locale: 'de-DE', currency: 'EUR' }),
		)

		expect(result.current.group).toBe('.')

		expect(result.current.decimal).toBe(',')
	})

	it('round-trips a typed comma-decimal amount through parseEditing', () => {
		const { result } = renderHook(() =>
			useCurrencyInputFormatting({ locale: 'de-DE', currency: 'EUR' }),
		)

		expect(parseEditing('1.234,56', result.current.group, result.current.decimal)).toBe(1234.56)
	})

	// ICU data: de-DE writes the group "." and the decimal ",". A format with
	// no fraction digits writes no decimal part.
	it.each([
		['at precision 0', { locale: 'de-DE', currency: 'EUR', precision: 0 }],
		['for a currency with no fraction digits (JPY)', { locale: 'de-DE', currency: 'JPY' }],
	] as const)('samples the de-DE decimal "," %s', (_name, options) => {
		const { result } = renderHook(() => useCurrencyInputFormatting(options))

		const { group, decimal, maxFractionDigits } = result.current

		expect(group).toBe('.')

		expect(decimal).toBe(',')

		// The display "1.234" and a typed "5" give "1.2345". The "." is a group.
		const edited = formatEditing('1.2345', 'de-DE', decimal, maxFractionDigits)

		expect(edited).toBe('12.345')

		expect(parseEditing(edited, group, decimal)).toBe(12345)
	})

	// ICU data: fr-CH writes the currency decimal "." and the plain decimal ",".
	// de-AT writes the currency group "." and the plain group U+00A0.
	it.each([
		['fr-CH', 'CHF', '\u202F', '.', '1\u202F234.50'],
		['de-AT', 'EUR', '.', ',', '1.234,50'],
	] as const)(
		'takes the %s separators from the currency style for display, editing, and parsing',
		(locale, currency, group, decimal, display) => {
			const { result } = renderHook(() => useCurrencyInputFormatting({ locale, currency }))

			expect(result.current.group).toBe(group)

			expect(result.current.decimal).toBe(decimal)

			expect(result.current.displayFormatter.format(1234.5)).toBe(display)

			// An edit of the display text keeps the separators and the value.
			const edited = formatEditing(display, locale, decimal, result.current.maxFractionDigits)

			expect(edited).toBe(display)

			expect(parseEditing(edited, group, decimal)).toBe(1234.5)
		},
	)

	// ICU data: sv-SE writes the minus sign U+2212.
	it('reads the sv-SE minus sign U+2212 of the display back as a negative value', () => {
		const { result } = renderHook(() =>
			useCurrencyInputFormatting({ locale: 'sv-SE', currency: 'SEK' }),
		)

		const { group, decimal, maxFractionDigits } = result.current

		const display = result.current.displayFormatter.format(-5)

		expect(display).toBe('\u22125,00')

		const edited = formatEditing(display, 'sv-SE', decimal, maxFractionDigits)

		expect(edited).toBe('-5,00')

		expect(parseEditing(edited, group, decimal)).toBe(-5)
	})
})
