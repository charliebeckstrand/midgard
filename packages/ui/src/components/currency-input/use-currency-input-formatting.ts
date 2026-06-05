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
	const formatter = useMemo(
		() =>
			new Intl.NumberFormat(locale, {
				style: 'currency',
				currency,
				...(precision !== undefined && {
					minimumFractionDigits: precision,
					maximumFractionDigits: precision,
				}),
			}),
		[locale, currency, precision],
	)

	const { symbol, symbolIsPrefix, group, decimal, maxFractionDigits } = useMemo(() => {
		const parts = formatter.formatToParts(0)

		const currencyPart = parts.find((p) => p.type === 'currency')

		const groupPart = parts.find((p) => p.type === 'group')

		const decimalPart = parts.find((p) => p.type === 'decimal')

		const currencyIdx = parts.findIndex((p) => p.type === 'currency')

		const integerIdx = parts.findIndex((p) => p.type === 'integer')

		const options = formatter.resolvedOptions()

		return {
			symbol: currencyPart?.value ?? '',
			symbolIsPrefix: currencyIdx < integerIdx,
			group: groupPart?.value ?? ',',
			decimal: decimalPart?.value ?? '.',
			maxFractionDigits: options.maximumFractionDigits ?? 2,
		}
	}, [formatter])

	const displayFormatter = useMemo(() => {
		const options = formatter.resolvedOptions()

		return new Intl.NumberFormat(locale, {
			style: 'decimal',
			useGrouping: true,
			minimumFractionDigits: options.minimumFractionDigits,
			maximumFractionDigits: options.maximumFractionDigits,
		})
	}, [formatter, locale])

	return { displayFormatter, symbol, symbolIsPrefix, group, decimal, maxFractionDigits }
}
