import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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

	it('builds a Intl.NumberFormat display formatter that groups thousands', () => {
		const { result } = renderHook(() => useCurrencyInputFormatting({ locale: 'en-US' }))

		expect(result.current.displayFormatter.format(1234567.89)).toBe('1,234,567.89')
	})
})
