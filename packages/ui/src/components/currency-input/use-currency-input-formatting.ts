'use client'

import { useMemo } from 'react'

type CurrencyFormattingOptions = {
	/** ISO 4217 currency code. Defaults to `USD`. */
	currency?: string
	/** BCP 47 locale tag. Defaults to the runtime default. */
	locale?: string
	/** Override the number of fraction digits. Defaults to the currency's standard. */
	precision?: number
}

type CurrencyFormattingResult = {
	displayFormatter: Intl.NumberFormat
	symbol: string
	symbolIsPrefix: boolean
	group: string
	decimal: string
	maxFractionDigits: number
}

export function useCurrencyInputFormatting({
	currency = 'USD',
	locale,
	precision,
}: CurrencyFormattingOptions): CurrencyFormattingResult {
	// `numberingSystem: 'latn'` pins ASCII digits; the editing parser only
	// recognizes 0-9 and strips native digits (ar-EG, fa-IR, ne-NP).
	// Separators stay locale-correct: formatToParts below extracts them, and
	// display and parsing agree.
	const formatter = useMemo(
		() =>
			new Intl.NumberFormat(locale, {
				style: 'currency',
				currency,
				numberingSystem: 'latn',
				...(precision !== undefined && {
					minimumFractionDigits: precision,
					maximumFractionDigits: precision,
				}),
			}),
		[locale, currency, precision],
	)

	const { symbol, symbolIsPrefix, group, decimal, maxFractionDigits } = useMemo(() => {
		// A large fractional sample forces group and decimal parts into the
		// output: formatToParts(0) emits neither, which would wire comma-decimal
		// locales (de-DE: group '.', decimal ',') to the en-US fallbacks and
		// make parseEditing strip the user's decimal comma as a group separator.
		const parts = formatter.formatToParts(1234567.89)

		const currencyPart = parts.find((p) => p.type === 'currency')

		const groupPart = parts.find((p) => p.type === 'group')

		const decimalPart = parts.find((p) => p.type === 'decimal')

		const currencyIdx = parts.findIndex((p) => p.type === 'currency')

		const integerIdx = parts.findIndex((p) => p.type === 'integer')

		const options = formatter.resolvedOptions()

		return {
			symbol: currencyPart?.value ?? '',
			symbolIsPrefix: currencyIdx < integerIdx,
			// If a locale emits no group part, never fall back to the decimal
			// char: parseEditing strips group chars before decimal substitution.
			group: groupPart?.value ?? (decimalPart?.value === ',' ? '.' : ','),
			decimal: decimalPart?.value ?? '.',
			maxFractionDigits: options.maximumFractionDigits ?? 2,
		}
	}, [formatter])

	const displayFormatter = useMemo(() => {
		const options = formatter.resolvedOptions()

		return new Intl.NumberFormat(locale, {
			style: 'decimal',
			useGrouping: true,
			numberingSystem: 'latn',
			minimumFractionDigits: options.minimumFractionDigits,
			maximumFractionDigits: options.maximumFractionDigits,
		})
	}, [formatter, locale])

	return { displayFormatter, symbol, symbolIsPrefix, group, decimal, maxFractionDigits }
}
