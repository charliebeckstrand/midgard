'use client'

import { type DefaultOptions, QueryClientProvider } from '@tanstack/react-query'
import NextLink from 'next/link'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { defineMessages, useIntl } from 'ui/primitives/intl'
import { AppearanceProvider } from 'ui/providers/appearance'
import { type LocaleConfig, LocaleProvider } from 'ui/providers/locale'
import { UIProvider } from 'ui/providers/ui'
import { useToast } from 'ui/toast'
import { catalogs } from '../locale/catalogs'
import { DEFAULT_LOCALE } from '../locale/locales'
import { createAppQueryClient } from './query-client'

type AppProvidersProps = {
	/**
	 * The query defaults of the app, such as a `staleTime` or no refetch on a
	 * window focus.
	 */
	queries?: DefaultOptions['queries']
	/**
	 * The time zone of each date that does not set its own. The server and the
	 * client then give the same text. With no zone, a date is in the zone of the
	 * reader and shows a skeleton until hydration.
	 *
	 * @defaultValue The zone of the reader.
	 */
	timeZone?: LocaleConfig['timeZone']
	/** The default format of a `DateTime` with no `format` of its own. */
	dateFormat?: LocaleConfig['dateFormat']
	children: ReactNode
}

/**
 * App-wide client providers: `AppearanceProvider`, `UIProvider` wired to
 * Next's `Link`, `LocaleProvider`, and one `QueryClient` for the whole app.
 * The root layout renders it as the content of `<body>`. `AppearanceProvider`
 * is the outermost provider, so its font script comes before all text, and
 * the dialogs and toasts of `UIProvider` read the Motion setting.
 *
 * The apps render in `en`. The text of each app is English, so the reader
 * cannot choose a locale, and `AppearanceSettings` has no Language picker. The
 * locale sets the formats, and the messages of ui and of shared. The provider
 * takes the catalogs of shared, and each `LocaleProvider` under it keeps them.
 * `LocaleProvider` is above `UIProvider`, so the dialog of `useConfirm`, which
 * `UIProvider` renders, uses the same locale as the page.
 *
 * A failed mutation shows its error in a toast, and a `401` sends the page to
 * `/login` (see {@link createAppQueryClient}). The `QueryClientProvider` is in
 * `UIProvider`, so that the client can show toasts.
 *
 * @remarks Top-level context per CONVENTIONS.md §6.1. Render it from the root
 * layout, in a `<body>` whose `<html>` has `suppressHydrationWarning`: the
 * server of the app writes the stored settings of the reader on `<html>`
 * (`rootMarks`). The client is built in state rather than at module scope, so a render
 * on the server never shares a cache between requests. The client reads
 * `queries` one time, when it is built.
 */
export function AppProviders({ queries, timeZone, dateFormat, children }: AppProvidersProps) {
	return (
		<AppearanceProvider>
			<LocaleProvider
				locale={DEFAULT_LOCALE}
				timeZone={timeZone}
				dateFormat={dateFormat}
				catalogs={catalogs}
			>
				<UIProvider link={NextLink}>
					<AppQueryProvider queries={queries}>{children}</AppQueryProvider>
				</UIProvider>
			</LocaleProvider>
		</AppearanceProvider>
	)
}

const messages = defineMessages({
	failed: {
		id: 'shared.mutation.failed',
		defaultMessage: 'Something went wrong',
		description: 'The title of the toast that shows the error of a change that failed.',
	},
})

// The `toast` of `useToast` keeps one identity, so the client can hold the first one.
function AppQueryProvider({
	queries,
	children,
}: {
	queries?: DefaultOptions['queries']
	children: ReactNode
}) {
	const { toast } = useToast()

	const intl = useIntl()

	// The client lives as long as the app, and the reader can change the locale.
	// The ref gives the toast title the intl of the newest commit.
	const intlRef = useRef(intl)

	useEffect(() => {
		intlRef.current = intl
	}, [intl])

	const [client] = useState(() =>
		createAppQueryClient({
			queries,
			toast,
			failureTitle: () => intlRef.current.formatMessage(messages.failed),
		}),
	)

	return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
