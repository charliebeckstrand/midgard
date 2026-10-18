'use client'

import { type DefaultOptions, QueryClientProvider } from '@tanstack/react-query'
import NextLink from 'next/link'
import { type ReactNode, useState } from 'react'
import { type LocaleConfig, LocaleProvider } from 'ui/providers/locale'
import { UIProvider } from 'ui/providers/ui'
import { useToast } from 'ui/toast'
import { catalogs } from '../locale/catalogs'
import { DEFAULT_LOCALE, LOCALES } from '../locale/locales'
import { createAppQueryClient } from './query-client'

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
 * `LocaleProvider`, and one `QueryClient` for the whole app. The root layout
 * renders it in ui's `UIDocument`, which holds the appearance of the app.
 *
 * The reader chooses the locale in the Language picker of `AppearanceSettings`.
 * The choice starts at System, which follows the languages of the browser. The
 * locale sets the formats, and the messages of ui and of shared. The provider
 * takes the catalogs of shared, and each `LocaleProvider` under it keeps them.
 * The static shell renders in `en`, so its server render and its hydration
 * render agree, and the choice applies after hydration. A layout that renders
 * per request wraps its subtree in `RequestLocale` from `shared/locale`, so its
 * server markup is already in the locale of the reader. `LocaleProvider` is
 * above `UIProvider`, so the dialog of `useConfirm`, which `UIProvider` renders,
 * uses the same locale as the page.
 *
 * A failed mutation shows its error in a toast, and a `401` sends the page to
 * `/login` (see {@link createAppQueryClient}). The `QueryClientProvider` is in
 * `UIProvider`, so that the client can show toasts.
 *
 * @remarks Top-level context per CONVENTIONS.md §6.1. Render it from the root
 * layout. The client is built in state rather than at module scope, so a render
 * on the server never shares a cache between requests. The client reads
 * `queries` one time, when it is built.
 */
export function AppProviders({ queries, timeZone, dateFormat, children }: AppProvidersProps) {
	return (
		<LocaleProvider
			locale={DEFAULT_LOCALE}
			locales={LOCALES}
			timeZone={timeZone}
			dateFormat={dateFormat}
			catalogs={catalogs}
		>
			<UIProvider link={NextLink}>
				<AppQueryProvider queries={queries}>{children}</AppQueryProvider>
			</UIProvider>
		</LocaleProvider>
	)
}

// The `toast` of `useToast` keeps one identity, so the client can hold the first one.
function AppQueryProvider({
	queries,
	children,
}: {
	queries?: DefaultOptions['queries']
	children: ReactNode
}) {
	const { toast } = useToast()

	const [client] = useState(() => createAppQueryClient({ queries, toast }))

	return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
