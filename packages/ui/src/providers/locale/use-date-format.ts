'use client'

import { useMemo } from 'react'
import { useHydrated } from '../../hooks/use-hydrated'
import { useLocale } from './context'

// The parts that make a format show a time of day.
const TIME_PARTS = ['hour', 'minute', 'second', 'dayPeriod', 'fractionalSecondDigits'] as const

/**
 * Resolves the options of one render of a date format. A set `timeZone` in
 * `options` wins in each render. Else the server render and the hydration
 * render use `timeZone`, and the render after hydration uses the zone of the
 * reader. Before hydration, a format that shows a time also shows the name of
 * the zone, so the reader does not take a time in another zone for a local
 * time. A format with `dateStyle`, `timeStyle`, or `timeZoneName` keeps its
 * own options, because `Intl` does not mix a style and a zone name.
 *
 * @internal
 */
export function resolveDateOptions(
	options: Intl.DateTimeFormatOptions,
	hydrated: boolean,
	timeZone = 'UTC',
): Intl.DateTimeFormatOptions {
	if (options.timeZone !== undefined || hydrated) return options

	const named =
		TIME_PARTS.some((part) => options[part] !== undefined) &&
		options.dateStyle === undefined &&
		options.timeStyle === undefined &&
		options.timeZoneName === undefined

	return named ? { ...options, timeZone, timeZoneName: 'short' } : { ...options, timeZone }
}

/**
 * Resolves `Intl.DateTimeFormat` options to a memoized formatter in the locale
 * and the time zone of the nearest `<LocaleProvider>`. With no `options`, it
 * takes the `dateFormat` of the provider.
 *
 * The server does not know the time zone of the reader. The server render and
 * the hydration render thus format in the `timeZone` of the provider (`'UTC'`
 * with no provider zone), and the two renders agree. A format that shows a
 * time adds the name of that zone. The render after hydration formats in the
 * zone of the reader. A `timeZone` in `options` fixes the zone for all
 * renders, for example `'UTC'` for a calendar day.
 *
 * @remarks The text of a date with a time changes after hydration when the
 * zone of the reader differs from the zone of the provider. Lay out for the
 * longer text, with the name of the zone.
 *
 * On a page that renders on a server, set the `locale` of the provider. With
 * no locale, the server and the browser can use different runtime defaults.
 *
 * @returns An `Intl.DateTimeFormat`, so `format`, `formatRange`, and
 * `formatToParts` all follow the same rules.
 * @example
 * ```tsx
 * const kickoff = useDateFormat({ weekday: 'short', hour: 'numeric', minute: '2-digit' })
 * kickoff.format(new Date(game.kickoff)) // 'Sun, 1:00 PM EDT', then 'Mon, 2:00 AM' in Tokyo
 * ```
 */
export function useDateFormat(options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
	const { locale, dateFormat, timeZone } = useLocale()

	const hydrated = useHydrated()

	// Serialize the options, so an inline literal (a new object in each render)
	// reuses one formatter.
	const key = JSON.stringify(options ?? dateFormat ?? {})

	return useMemo(
		() =>
			new Intl.DateTimeFormat(
				locale,
				resolveDateOptions(JSON.parse(key) as Intl.DateTimeFormatOptions, hydrated, timeZone),
			),
		[key, locale, timeZone, hydrated],
	)
}
