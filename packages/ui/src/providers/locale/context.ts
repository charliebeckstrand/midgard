'use client'

import { createContext } from '../../core'

/**
 * App-wide `Intl` formatting defaults. Format-aware components (currency,
 * number, date, time, phone fields) read this when their own props are
 * unspecified. A single `<LocaleProvider>` at the app root configures the
 * whole tree.
 *
 * @remarks
 * Every field feeds an `Intl.*` formatter. The type carries no string
 * catalog, and it is not a translation layer. A catalog waits for a real
 * second locale.
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
}

/** Reads the ambient {@link LocaleConfig} from the nearest `<LocaleProvider>`; returns `{}` outside one. */
export const [LocaleContext, useLocale] = createContext<LocaleConfig>('Locale', {
	default: {},
})
