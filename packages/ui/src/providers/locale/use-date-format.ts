'use client'

import { useMemo } from 'react'
import { useHydrated } from '../../hooks/use-hydrated'
import { useLocale } from './context'

/**
 * Resolves `Intl.DateTimeFormat` options to a memoized formatter in the locale
 * and the time zone of the nearest `<LocaleProvider>`. With no `options`, it
 * takes the `dateFormat` of the provider.
 *
 * A `timeZone` in `options` sets the zone, for example `'UTC'` for a calendar
 * day. Else the `timeZone` of the provider sets it. With no zone from either,
 * the formatter uses the zone of the reader.
 *
 * The hook returns `undefined` on the server and in the hydration render, also
 * when the zone is set. Show a skeleton in that state. The render after
 * hydration gives the formatter. The text of `Intl` comes from the date data
 * of the JavaScript engine, and two engines can write different text for one
 * format, such as Node on the server and Safari in the browser. Text from the
 * server would then differ from the text of the hydration render, and React
 * would render the tree again from the start. A page that must paint a date in
 * its first frame formats it on the server and passes the text.
 *
 * @remarks On a page that renders on a server, set the `locale` of the
 * provider. With no locale, the server and the browser can use different
 * runtime defaults.
 *
 * @returns An `Intl.DateTimeFormat`, so `format`, `formatRange`, and
 * `formatToParts` all follow the same rules. `undefined` until hydration.
 * @example
 * ```tsx
 * const kickoff = useDateFormat({ weekday: 'short', hour: 'numeric', minute: '2-digit' })
 * kickoff?.format(new Date(game.kickoff)) // undefined until hydration, then 'Mon 2:00 AM' in Tokyo
 * ```
 */
export function useDateFormat(
	options?: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat | undefined {
	const { locale, dateFormat, timeZone } = useLocale()

	const resolved = options ?? dateFormat ?? {}

	const zone = resolved.timeZone ?? timeZone

	// The browser formats, after hydration (see above).
	const ready = useHydrated()

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
