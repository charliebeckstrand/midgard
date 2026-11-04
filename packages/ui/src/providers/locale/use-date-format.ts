'use client'

import { useMemo } from 'react'
import { useHydrated } from '../../hooks/use-hydrated'
import { useLocale } from './context'

/** Options whose `timeZone` is set, so the formatter does not wait for the zone of the reader. */
type ZonedDateOptions = Intl.DateTimeFormatOptions & { timeZone: string }

/**
 * Resolves `Intl.DateTimeFormat` options to a memoized formatter in the locale
 * and the time zone of the nearest `<LocaleProvider>`. With no `options`, it
 * takes the `dateFormat` of the provider.
 *
 * A `timeZone` in `options` sets the zone, for example `'UTC'` for a calendar
 * day. Else the `timeZone` of the provider sets it. The formatter then formats
 * in that zone in each render, so the server and the client give the same
 * text.
 *
 * With no zone from either, the formatter uses the zone of the reader. The
 * server does not know that zone, so the hook returns `undefined` on the server
 * and in the hydration render. Show a skeleton in that state. The render after
 * hydration gives the formatter.
 *
 * @remarks On a page that renders on a server, set the `locale` of the
 * provider. With no locale, the server and the browser can use different
 * runtime defaults.
 *
 * @returns An `Intl.DateTimeFormat`, so `format`, `formatRange`, and
 * `formatToParts` all follow the same rules. `undefined` while the zone of the
 * reader is not known.
 * @example
 * ```tsx
 * const kickoff = useDateFormat({ weekday: 'short', hour: 'numeric', minute: '2-digit' })
 * kickoff?.format(new Date(game.kickoff)) // undefined until hydration, then 'Mon 2:00 AM' in Tokyo
 * ```
 */
export function useDateFormat(options: ZonedDateOptions): Intl.DateTimeFormat
export function useDateFormat(options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat | undefined
export function useDateFormat(
	options?: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat | undefined {
	const { locale, dateFormat, timeZone } = useLocale()

	const resolved = options ?? dateFormat ?? {}

	const zone = resolved.timeZone ?? timeZone

	// A set zone formats at once. The zone of the reader waits for hydration.
	const ready = useHydrated() || zone !== undefined

	// Serialize the options, so an inline literal (a new object in each render)
	// reuses one formatter.
	const key = JSON.stringify(resolved)

	return useMemo(
		() =>
			ready
				? new Intl.DateTimeFormat(locale, {
						...(JSON.parse(key) as Intl.DateTimeFormatOptions),
						timeZone: zone,
					})
				: undefined,
		[key, locale, zone, ready],
	)
}
