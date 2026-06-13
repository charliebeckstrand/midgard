'use client'

import { createContext } from '../../core'

/**
 * App-wide internationalization defaults. Locale-aware components (currency,
 * number, date, time, phone fields) read this when their own props are
 * unspecified. A single `<LocaleProvider>` at the app root configures the
 * whole tree.
 */
export type LocaleConfig = {
	/** BCP 47 locale tag (e.g. `'en-US'`, `'fr-FR'`). */
	locale?: string
	/** ISO 4217 currency code (e.g. `'USD'`, `'EUR'`). */
	currency?: string
	/** Default options for `Intl.NumberFormat`-based components. */
	numberFormat?: Intl.NumberFormatOptions
	/** Default options for `Intl.DateTimeFormat`-based components. */
	dateFormat?: Intl.DateTimeFormatOptions
	/** IANA time zone identifier (e.g. `'America/Los_Angeles'`). */
	timeZone?: string
}

/** Reads the ambient {@link LocaleConfig} from the nearest `<LocaleProvider>`; returns `{}` outside one. */
export const [LocaleContext, useLocale] = createContext<LocaleConfig>('Locale', {
	default: {},
})
