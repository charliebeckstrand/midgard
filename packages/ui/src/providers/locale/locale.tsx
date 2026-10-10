'use client'

import { type ReactNode, useMemo } from 'react'
import { Direction, type TextDirection } from '../../primitives/direction'
import { type LocaleConfig, LocaleContext, useLocale } from './context'

/**
 * Props for {@link LocaleProvider}: the {@link LocaleConfig} defaults to
 * broadcast, the optional `dir` of the region, plus `children`.
 */
export type LocaleProviderProps = LocaleConfig & {
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
 * Set the direction of a region through `dir` here, not through a raw `dir`
 * attribute. A raw attribute is a DOM setting only, and a portaled surface
 * goes out of its subtree. A `dir` on the root element needs neither, because
 * every portal sits under the root.
 */
export function LocaleProvider({
	locale,
	currency,
	numberFormat,
	dateFormat,
	timeZone,
	dir,
	children,
}: LocaleProviderProps) {
	// The outer value keeps its identity until a field of it changes.
	const outer = useLocale()

	const value = useMemo<LocaleConfig>(
		() => ({
			locale: locale ?? outer.locale,
			currency: currency ?? outer.currency,
			numberFormat: numberFormat ?? outer.numberFormat,
			dateFormat: dateFormat ?? outer.dateFormat,
			timeZone: timeZone ?? outer.timeZone,
		}),
		[locale, currency, numberFormat, dateFormat, timeZone, outer],
	)

	const scoped = dir ? (
		<span data-slot="locale" dir={dir} className="contents">
			<Direction dir={dir}>{children}</Direction>
		</span>
	) : (
		children
	)

	return <LocaleContext value={value}>{scoped}</LocaleContext>
}
