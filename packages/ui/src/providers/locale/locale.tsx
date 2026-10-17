'use client'

import { type ReactNode, useMemo } from 'react'
import { Direction, type TextDirection } from '../../primitives/direction'
import {
	LocaleChoiceContext,
	type LocaleChoiceValue,
	type LocaleConfig,
	LocaleContext,
	useLocale,
	useLocaleChoice,
} from './context'
import { writeLocaleChoice } from './locale-choice'
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
	 * of the browser, else `locale`. The server render and the hydration render
	 * use `locale`. With no `locale`, they use the locale of the enclosing
	 * provider, else the first entry of `locales`.
	 *
	 * Set it on the provider at the root of the app only. All the providers with
	 * `locales` share one stored choice.
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
 * aggregates, and Odometer take its `locale`.
 *
 * @remarks
 * This is a formatting provider, not a translation layer. It holds no string
 * catalog, and it never supplies the text a component renders. Control
 * strings stay hardcoded English until a second locale lands; a catalog
 * waits for that locale, so its keys answer to a real consumer.
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
 * `localStorage`. The server does not know the choice, so the server render and
 * the hydration render use `locale`. A formatted value can thus change its text
 * after hydration, as a date does for the time zone. The choice changes the
 * formats only. The text of the controls stays English.
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
	// The outer value keeps its identity until a field of it changes.
	const outer = useLocale()

	const outerChoice = useLocaleChoice()

	const stored = useStoredLocale(locales, locale ?? outer.locale ?? locales?.[0])

	const value = useMemo<LocaleConfig>(
		() => ({
			locale: stored.locale,
			currency: currency ?? outer.currency,
			numberFormat: numberFormat ?? outer.numberFormat,
			dateFormat: dateFormat ?? outer.dateFormat,
			timeZone: timeZone ?? outer.timeZone,
		}),
		[stored.locale, currency, numberFormat, dateFormat, timeZone, outer],
	)

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
			<LocaleContext value={value}>{scoped}</LocaleContext>
		</LocaleChoiceContext>
	)
}
