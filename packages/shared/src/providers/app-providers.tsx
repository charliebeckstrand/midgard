'use client'

import { type DefaultOptions, QueryClientProvider } from '@tanstack/react-query'
import NextLink from 'next/link'
import { type ReactNode, useState } from 'react'
import { defineMessages, useIntl } from 'ui/primitives/intl'
import { AppearanceProvider } from 'ui/providers/appearance'
import { type LocaleConfig, LocaleProvider } from 'ui/providers/locale'
import { UIProvider } from 'ui/providers/ui'
import { useToast } from 'ui/toast'
import { catalogs } from '../locale/catalogs'
import { DEFAULT_LOCALE } from '../locale/locales'
import { createAppQueryClient } from './query-client'

/** The id of the mark at the end of the shell, which the render-blocking link names. */
const SHELL_END = 'shell-end'

/**
 * The query defaults of each app. A server page seeds each read into its query
 * (see `seededQuery`). With no stale time, the client fetches the same read
 * again at hydration.
 */
const QUERIES: DefaultOptions['queries'] = { staleTime: 30_000 }

type AppProvidersProps = {
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
 * `UIProvider` renders, uses the same locale as the page. The provider sets no
 * time zone, so a date with no zone of its own is in the zone of the reader.
 *
 * A failed mutation shows its error in a toast, and a `401` sends the page to
 * `/login` (see {@link createAppQueryClient}). A query stays fresh for 30
 * seconds, so the client does not fetch a seeded read again at hydration. The
 * `QueryClientProvider` is in `UIProvider`, so that the client can show toasts.
 *
 * The browser paints the HTML of a page while it parses it, and a page can
 * come in parts. Thus a frame could show half a page, such as a page with no
 * Drawer over it. After the providers, an empty `template` with the id
 * `shell-end` marks the end of the shell of React. A `link` with
 * `rel="expect"` and `blocking="render"` names that mark, and React puts the
 * link in the head. The browser then holds the first paint until it parses the
 * mark, so the first paint has the whole shell. A browser without support for
 * the link paints as before. Each Suspense boundary of a page streams after the
 * shell, as before.
 *
 * @remarks Top-level context per CONVENTIONS.md §6.1. Render it from the root
 * layout, in a `<body>` whose `<html>` has `suppressHydrationWarning`: the
 * server of the app writes the stored settings of the reader on `<html>`
 * (`rootMarks`). The client is built in state rather than at module scope, so a render
 * on the server never shares a cache between requests.
 */
export function AppProviders({ dateFormat, children }: AppProvidersProps) {
	return (
		<>
			<link rel="expect" href={`#${SHELL_END}`} blocking="render" />

			<AppearanceProvider>
				<LocaleProvider locale={DEFAULT_LOCALE} dateFormat={dateFormat} catalogs={catalogs}>
					<UIProvider link={NextLink}>
						<AppQueryProvider>{children}</AppQueryProvider>
					</UIProvider>
				</LocaleProvider>
			</AppearanceProvider>

			<template id={SHELL_END} />
		</>
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
function AppQueryProvider({ children }: { children: ReactNode }) {
	const { toast } = useToast()

	const intl = useIntl()

	const [client] = useState(() =>
		createAppQueryClient({
			queries: QUERIES,
			toast,
			failureTitle: () => intl.formatMessage(messages.failed),
		}),
	)

	return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
