'use client'

import { type ReactNode, useMemo } from 'react'
import { type LocaleConfig, LocaleContext, useLocale } from './context'

/** Props for {@link LocaleProvider}: the {@link LocaleConfig} defaults to broadcast, plus `children`. */
export type LocaleProviderProps = LocaleConfig & {
	children: ReactNode
}

/**
 * Broadcasts `Intl` formatting defaults (locale tag, currency, number and date
 * options) to format-aware components. Explicit props on individual components
 * still win.
 *
 * @remarks
 * This is a formatting provider, not a translation layer. It holds no string
 * catalog, and it never supplies the text a component renders. Control
 * strings stay hardcoded English until a second locale lands; a catalog
 * waits for that locale, so its keys answer to a real consumer.
 *
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
