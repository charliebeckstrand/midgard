'use client'

import { type ReactNode, useMemo } from 'react'
import { Direction, type TextDirection } from '../../primitives/direction'
import { IntlProvider } from '../../primitives/intl/intl-provider'
import type { IntlCatalogs } from '../../primitives/intl/types'
import { writeChoice } from '../appearance/appearance-storage'
import {
	LocaleChoiceContext,
	type LocaleChoiceValue,
	type LocaleConfig,
	LocaleContext,
	useLocale,
	useLocaleChoice,
} from './context'
import { localeChoice } from './locale-choice'
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
	/**
	 * The translated messages of an app or a package, by language subtag and
	 * then by message id. They merge over the catalogs of ui and over the
	 * catalogs of each enclosing provider, so a nested provider adds to them. A
	 * message with the same id as an outer message replaces it.
	 *
	 * Give a constant of a module, not an object that each render builds: the
	 * provider keeps one intl for each catalog object, and a new object makes a
	 * new intl.
	 */
	catalogs?: IntlCatalogs
	children: ReactNode
}

/**
 * The provider of the `Intl` formatting defaults (locale tag, currency, number and
 * date options, time zone) of format-aware components. Explicit props on individual components
 * still win. The default number formats of charts, maps, PivotTable, grid
 * aggregates, and Odometer take its `locale`. The controls of ui also show
 * their text in the language of the `locale`.
 *
 * @remarks
 * The provider also gives the intl of its locale to the controls
 * of ui. A control shows its built-in text, such as the name of a Close button,
 * from the catalog of the language of the locale. {@link CATALOG_LOCALES}
 * lists the languages that ui has a catalog for. A language with no catalog,
 * and a message that a catalog does not have, show the English default. A prop that sets the text of a
 * control still wins. An app or a package gives the translations of its own
 * messages through `catalogs`, and reads them through `useIntl` from
 * `ui/primitives/intl`.
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
 * With `locales`, the reader chooses the locale. The choice persists in the
 * cookie {@link LOCALE_COOKIE}, with a copy in `localStorage`. The provider
 * reads the choice in the browser only, so the server render and the hydration
 * render use `locale`. A formatted value can thus change its text after
 * hydration, as a date does for the time zone, and the text of a control can
 * change its language. A server that renders per request can read the cookie
 * with {@link resolveRequestLocale}, and render a nested provider in the
 * locale of the reader. That provider agrees with the browser from the first
 * render.
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
	catalogs,
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

	const choice = useMemo<LocaleChoiceValue | null>(
		() =>
			locales
				? {
						choice: stored.choice,
						locales,
						setChoice: (next: string) => writeChoice(localeChoice(locales), next),
					}
				: null,
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
				<IntlProvider locale={stored.locale} catalogs={catalogs}>
					{scoped}
				</IntlProvider>
			</LocaleContext>
		</LocaleChoiceContext>
	)
}
