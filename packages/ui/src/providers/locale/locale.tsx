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
 * config alone, which is how `<UIProvider>` nests. So a nested
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
	const outer = useLocale()

	const value = useMemo<LocaleConfig>(
		() => ({
			locale: locale ?? outer.locale,
			currency: currency ?? outer.currency,
			numberFormat: numberFormat ?? outer.numberFormat,
			dateFormat: dateFormat ?? outer.dateFormat,
		}),
		[locale, currency, numberFormat, dateFormat, outer],
	)

	return <LocaleContext value={value}>{children}</LocaleContext>
}
