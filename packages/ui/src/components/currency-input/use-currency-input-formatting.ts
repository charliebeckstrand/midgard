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

/** Writes the number of a currency amount without the currency symbol. */
type CurrencyDisplayFormatter = {
	format: (value: number) => string
}

type CurrencyFormattingResult = {
	displayFormatter: CurrencyDisplayFormatter
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
	// The currency style supplies the separators for display, editing, and
	// parsing. The decimal style of some locales writes other separators
	// (fr-CH, de-AT), so no part of the editor uses it. `useGrouping: true`
	// groups each integer of four digits or more, as `formatEditing` does.
	const formatter = useMemo(
		() =>
			new Intl.NumberFormat(locale, {
				style: 'currency',
				currency,
				numberingSystem: 'latn',
				useGrouping: true,
				...(precision !== undefined && {
					minimumFractionDigits: precision,
					maximumFractionDigits: precision,
				}),
			}),
		[locale, currency, precision],
	)

	// The separator sample keeps one fraction digit. A format with no fraction
	// digits (JPY, `precision` 0) writes no decimal part. The fallback "." is
	// the group of some locales (de-DE), and the editor then reads a group as
	// the decimal.
	const sampler = useMemo(
		() =>
			new Intl.NumberFormat(locale, {
				style: 'currency',
				currency,
				numberingSystem: 'latn',
				useGrouping: true,
				minimumFractionDigits: 1,
				maximumFractionDigits: 1,
			}),
		[locale, currency],
	)

	const { symbol, symbolIsPrefix, group, decimal, maxFractionDigits } = useMemo(() => {
		// A large fractional sample forces group and decimal parts into the
		// output: formatToParts(0) emits neither, which would wire comma-decimal
		// locales (de-DE: group '.', decimal ',') to the en-US fallbacks and
		// make parseEditing strip the user's decimal comma as a group separator.
		const parts = sampler.formatToParts(1234567.8)

		const currencyIdx = parts.findIndex((p) => p.type === 'currency')

		const currencyPart = parts[currencyIdx]

		const groupPart = parts.find((p) => p.type === 'group')

		const decimalPart = parts.find((p) => p.type === 'decimal')

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
	}, [formatter, sampler])

	// The display writes the number parts of the currency style. The affix
	// shows the symbol, so the display drops the symbol and the literal text
	// around it, such as a space or a bidi mark. The minus sign stays as the
	// locale writes it (sv-SE U+2212), and `formatEditing` reads it as "-".
	const displayFormatter = useMemo<CurrencyDisplayFormatter>(
		() => ({
			format: (value) =>
				formatter
					.formatToParts(value)
					.filter((part) => part.type !== 'currency' && part.type !== 'literal')
					.map((part) => part.value)
					.join(''),
		}),
		[formatter],
	)

	return { displayFormatter, symbol, symbolIsPrefix, group, decimal, maxFractionDigits }
}
