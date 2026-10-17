'use client'

import { createContext } from '../../core'

/**
 * App-wide `Intl` formatting defaults. Format-aware components (currency,
 * number, date, time, phone fields) read this when their own props are
 * unspecified. A single `<LocaleProvider>` at the app root configures the
 * whole tree.
 *
 * @remarks
 * Every field feeds an `Intl.*` formatter. The `locale` also selects the
 * catalog of the messages of ui, which `LocaleProvider` gives to the controls.
 */
export type LocaleConfig = {
	/**
	 * BCP 47 locale tag (e.g. `'en-US'`, `'fr-FR'`). On a page that renders on a
	 * server, set it, so the server markup and the client use the same locale.
	 */
	locale?: string
	/** ISO 4217 currency code (e.g. `'USD'`, `'EUR'`). */
	currency?: string
	/** Default options for `Intl.NumberFormat`-based components. */
	numberFormat?: Intl.NumberFormatOptions
	/** Default options for `Intl.DateTimeFormat`-based components. */
	dateFormat?: Intl.DateTimeFormatOptions
	/**
	 * IANA time zone (e.g. `'UTC'`, `'America/New_York'`) of the server render
	 * and the hydration render of a date. The server does not know the zone of
	 * the reader, so both renders use this zone. The render after hydration uses
	 * the zone of the reader. `useDateFormat` and `DateTime` read it.
	 *
	 * @defaultValue `'UTC'` in `useDateFormat`.
	 */
	timeZone?: string
}

/**
 * Reads the ambient {@link LocaleConfig} from the nearest `<LocaleProvider>`; returns `{}` outside one.
 *
 * @remarks Outside a provider, a component with no `locale` prop takes the
 * runtime default of the side that renders. On a page that renders on a
 * server, the two sides can then disagree. Such a page sets a provider
 * `locale` or a component `locale`.
 */
export const [LocaleContext, useLocale] = createContext<LocaleConfig>('Locale', {
	default: {},
})

/**
 * The locale choice of the nearest `<LocaleProvider>` that has `locales`. The
 * Language picker of `AppearanceSettings` reads it.
 *
 * @internal
 */
export type LocaleChoiceValue = {
	/** The stored choice: `'system'`, or one of `locales`. */
	choice: string
	/** The locales that the reader can choose from. */
	locales: readonly string[]
	/** Stores a new choice. */
	setChoice: (choice: string) => void
}

/**
 * Reads the {@link LocaleChoiceValue} of the nearest `<LocaleProvider>` that
 * has `locales`; returns `null` outside one.
 *
 * @internal
 */
export const [LocaleChoiceContext, useLocaleChoice] = createContext<LocaleChoiceValue | null>(
	'LocaleChoice',
	{ default: null },
)
