'use client'

import { type DefaultOptions, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NextLink from 'next/link'
import { type ReactNode, useState } from 'react'
import { AppearanceProvider } from 'ui/providers/appearance'
import { type LocaleConfig, LocaleProvider } from 'ui/providers/locale'
import { UIProvider } from 'ui/providers/ui'

type AppProvidersProps = {
	/**
	 * The query defaults of the app, such as a `staleTime` or no refetch on a
	 * window focus.
	 */
	queries?: DefaultOptions['queries']
	/**
	 * The time zone of the server render and the hydration render of a date. The
	 * render after hydration uses the zone of the reader.
	 *
	 * @defaultValue `'UTC'`
	 */
	timeZone?: LocaleConfig['timeZone']
	/** The default format of a `DateTime` with no `format` of its own. */
	dateFormat?: LocaleConfig['dateFormat']
	children: ReactNode
}

/**
 * App-wide client providers: `UIProvider` wired to Next's `Link`,
 * `AppearanceProvider` for the persisted theme and density, `LocaleProvider`,
 * and one `QueryClient` for the whole app.
 *
 * The locale is `en-US`, the language of the text of ui and of the apps. A
 * fixed locale also makes the server render and the hydration render agree.
 *
 * @remarks Top-level context per CONVENTIONS.md §6.1. Render it from the root
 * layout. The client is built in state rather than at module scope, so a render
 * on the server never shares a cache between requests. The client reads
 * `queries` one time, when it is built.
 */
export function AppProviders({ queries, timeZone, dateFormat, children }: AppProvidersProps) {
	const [client] = useState(() => new QueryClient({ defaultOptions: { queries } }))

	return (
		<QueryClientProvider client={client}>
			<UIProvider link={NextLink}>
				<LocaleProvider locale="en-US" timeZone={timeZone} dateFormat={dateFormat}>
					<AppearanceProvider>{children}</AppearanceProvider>
				</LocaleProvider>
			</UIProvider>
		</QueryClientProvider>
	)
}
