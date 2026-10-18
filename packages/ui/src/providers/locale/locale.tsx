'use client'

import { type ReactNode, useEffect, useMemo } from 'react'
import { RawIntlProvider } from 'react-intl'
import { Direction, type TextDirection } from '../../primitives/direction'
import { englishIntl, localeIntl } from '../../primitives/intl/intl-catalog'
import {
	LocaleChoiceContext,
	type LocaleChoiceValue,
	type LocaleConfig,
	LocaleContext,
	useLocale,
	useLocaleChoice,
} from './context'
import { SYSTEM_LOCALE, syncLocaleCookie, writeLocaleChoice } from './locale-choice'
import { useStoredLocale } from './use-stored-locale'

/**
 * Props for {@link LocaleProvider}: the {@link LocaleConfig} defaults to
 * broadcast, the optional `locales` that the reader can choose from, the
 * optional `dir` of the region, plus `children`.
 */
export type LocaleProviderProps = LocaleConfig & {
	/**
	 * The locales that the reader can choose from, as BCP 47 tags. With it, the
	 * provider stores the choice of the reader, and `AppearanceSettings` shows a
	 * Language picker. The stored locale replaces `locale` after hydration.
	 *
	 * The first choice is System. It takes the locale that matches the languages
	 * of the browser, else the locale of the server render. The server render and
	 * the hydration render use `locale`. With no `locale`, they use the locale of
	 * the enclosing provider, else the first entry of `locales`.
	 *
	 * Set it on the provider at the root of the app. All the providers with
	 * `locales` share one stored choice, so a nested provider with the same
	 * `locales` follows the choice of the root. A server can render such a nested
	 * provider in the locale of a request.
	 */
	locales?: readonly [string, ...string[]]
	/**
	 * The text direction of the region. A wrapper element writes it as `dir`,
	 * and the provider opens a direction scope at the same value. So a dialog,
	 * a menu, or a panel that the region opens lays out in that direction,
	 * although it portals out of the region. Omit it to add no element and keep
	 * the direction of the enclosing region.
	 *
	 * @defaultValue `'ltr'`, or the direction of the enclosing region.
	 */
	dir?: TextDirection
	children: ReactNode
}

/**
 * Broadcasts `Intl` formatting defaults (locale tag, currency, number and date
 * options, time zone) to format-aware components. Explicit props on individual components
 * still win. The default number formats of charts, maps, PivotTable, grid
 * aggregates, and Odometer take its `locale`. The controls of ui also show
 * their text in the language of the `locale`.
 *
 * @remarks
 * The provider also gives the `react-intl` intl of its locale to the controls
 * of ui. A control shows its built-in text, such as the name of a Close button,
 * from the catalog of the language of the locale. ui has an English and a
 * Spanish catalog. A language with no catalog, and a message that a catalog
 * does not have, show the English default. A prop that sets the text of a
 * control still wins. The text that an app renders is not in the catalog of ui.
 *
 * A nested provider overrides one field and leaves the rest of the enclosing
 * config alone. So a nested `<LocaleProvider currency="EUR">` keeps the outer
 * `locale` and `dateFormat` for its subtree rather than clearing them.
 *
 * On a page that renders on a server, set `locale` here or on each component.
 * With no locale, a component reads the runtime default of the side that
 * renders. The server and the browser can have different defaults, and the
 * hydration render then does not match the server markup.
 *
 * With `locales`, the reader chooses the locale, and the choice persists in
 * `localStorage`. The provider cannot read the choice on the server, so the
 * server render and the hydration render use `locale`. A formatted value can thus change its text
 * after hydration, as a date does for the time zone, and the text of a control
 * can change its language. The provider also writes the choice to the cookie
 * {@link LOCALE_COOKIE}. A server that renders per request can thus read the
 * choice with {@link resolveRequestLocale}, and render a nested provider in the
 * locale of the reader.
 *
 * Set the direction of a region through `dir` here, not through a raw `dir`
 * attribute. A raw attribute is a DOM setting only, and a portaled surface
 * goes out of its subtree. A `dir` on the root element needs neither, because
 * every portal sits under the root.
 */
export function LocaleProvider({
	locale,
	locales,
	currency,
	numberFormat,
	dateFormat,
	timeZone,
	dir,
	children,
}: LocaleProviderProps) {
	const outer = useLocale()

	const outerChoice = useLocaleChoice()

	const stored = useStoredLocale(locales, locale ?? outer.locale ?? locales?.[0])

	// The memo reads the resolved fields, not the outer value. A nested provider
	// with its own locale thus keeps its value when only the outer locale
	// changes, as it does after hydration.
	const resolvedCurrency = currency ?? outer.currency

	const resolvedNumberFormat = numberFormat ?? outer.numberFormat

	const resolvedDateFormat = dateFormat ?? outer.dateFormat

	const resolvedTimeZone = timeZone ?? outer.timeZone

	const value = useMemo<LocaleConfig>(
		() => ({
			locale: stored.locale,
			currency: resolvedCurrency,
			numberFormat: resolvedNumberFormat,
			dateFormat: resolvedDateFormat,
			timeZone: resolvedTimeZone,
		}),
		[stored.locale, resolvedCurrency, resolvedNumberFormat, resolvedDateFormat, resolvedTimeZone],
	)

	// One intl serves each locale, so a nested provider in the locale of the
	// enclosing provider gives the same intl to its subtree. A provider has no
	// locale only when no enclosing provider has one.
	const intl = stored.locale === undefined ? englishIntl : localeIntl(stored.locale)

	// A choice stored before the cookie existed reaches the cookie here. The
	// hydration render and a provider with no `locales` read `'system'`, so the
	// effect skips System. A System choice of the reader reaches the cookie
	// through the setter.
	useEffect(() => {
		if (stored.choice !== SYSTEM_LOCALE) syncLocaleCookie(stored.choice)
	}, [stored.choice])

	const choice = useMemo<LocaleChoiceValue | null>(
		() => (locales ? { choice: stored.choice, locales, setChoice: writeLocaleChoice } : null),
		[locales, stored.choice],
	)

	const scoped = dir ? (
		<span data-slot="locale" dir={dir} className="contents">
			<Direction dir={dir}>{children}</Direction>
		</span>
	) : (
		children
	)

	// A provider with no `locales` passes the outer choice through, so a picker
	// under a nested provider still edits the choice of the root.
	return (
		<LocaleChoiceContext value={choice ?? outerChoice}>
			<LocaleContext value={value}>
				<RawIntlProvider value={intl}>{scoped}</RawIntlProvider>
			</LocaleContext>
		</LocaleChoiceContext>
	)
}
