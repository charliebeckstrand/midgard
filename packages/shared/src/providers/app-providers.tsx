'use client'

import { type DefaultOptions, QueryClientProvider } from '@tanstack/react-query'
import NextLink from 'next/link'
import { type ReactNode, useState } from 'react'
import { type LocaleConfig, LocaleProvider } from 'ui/providers/locale'
import { UIProvider } from 'ui/providers/ui'
import { useToast } from 'ui/toast'
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
 * The locale is `en-US`, the language of the text of ui and of the apps. A
 * fixed locale also makes the server render and the hydration render agree.
 * `LocaleProvider` is above `UIProvider`, so the dialog of `useConfirm`, which
 * `UIProvider` renders, formats dates in the same way as the page.
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
		<LocaleProvider locale="en-US" timeZone={timeZone} dateFormat={dateFormat}>
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
