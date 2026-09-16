'use client'

import { type ReactNode, useMemo } from 'react'
import { type LocaleConfig, LocaleContext, useLocale } from './context'

/** Props for {@link LocaleProvider}: the {@link LocaleConfig} defaults to broadcast, plus `children`. */
export type LocaleProviderProps = LocaleConfig & {
	children: ReactNode
}

/**
 * Broadcasts internationalization defaults (locale, currency, number and date
 * formatting options) to locale-aware components. Explicit props on individual
 * components still win.
 *
 * @remarks
 * A nested provider overrides one field and leaves the rest of the enclosing
 * config alone, the way `<Density>` folds its parent token. So a nested
 * `<LocaleProvider currency="EUR">` keeps the outer `locale` and `dateFormat`
 * for its subtree rather than clearing them.
 */
export function LocaleProvider({
	locale,
	currency,
	numberFormat,
	dateFormat,
	children,
}: LocaleProviderProps) {
	const {
		locale: outerLocale,
		currency: outerCurrency,
		numberFormat: outerNumberFormat,
		dateFormat: outerDateFormat,
	} = useLocale()

	const value = useMemo<LocaleConfig>(
		() => ({
			locale: locale ?? outerLocale,
			currency: currency ?? outerCurrency,
			numberFormat: numberFormat ?? outerNumberFormat,
			dateFormat: dateFormat ?? outerDateFormat,
		}),
		[
			locale,
			currency,
			numberFormat,
			dateFormat,
			outerLocale,
			outerCurrency,
			outerNumberFormat,
			outerDateFormat,
		],
	)

	return <LocaleContext value={value}>{children}</LocaleContext>
}
