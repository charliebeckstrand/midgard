import { type ReactNode, useMemo } from 'react'
import { type LocaleConfig, LocaleValueProvider } from './context'

export type LocaleProviderProps = LocaleConfig & {
	children: ReactNode
}

/**
 * Broadcasts internationalization defaults — locale, currency, number / date
 * formatting options, time zone — so locale-aware components inherit them
 * without per-call props. Explicit props on individual components still win.
 */
export function LocaleProvider({
	locale,
	currency,
	numberFormat,
	dateFormat,
	timeZone,
	children,
}: LocaleProviderProps) {
	const value = useMemo<LocaleConfig>(
		() => ({ locale, currency, numberFormat, dateFormat, timeZone }),
		[locale, currency, numberFormat, dateFormat, timeZone],
	)

	return <LocaleValueProvider value={value}>{children}</LocaleValueProvider>
}
