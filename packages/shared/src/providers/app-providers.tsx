'use client'

import { type DefaultOptions, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NextLink from 'next/link'
import { type ReactNode, useState } from 'react'
import { AppearanceProvider } from 'ui/providers/appearance'
import { UIProvider } from 'ui/providers/ui'

type AppProvidersProps = {
	/**
	 * The query defaults of the app, such as a `staleTime` or no refetch on a
	 * window focus.
	 */
	queries?: DefaultOptions['queries']
	children: ReactNode
}

/**
 * App-wide client providers: `UIProvider` wired to Next's `Link`,
 * `AppearanceProvider` for the persisted theme and density, and one
 * `QueryClient` for the whole app.
 *
 * @remarks Top-level context per CONVENTIONS.md §6.1. Render it from the root
 * layout. The client is built in state rather than at module scope, so a render
 * on the server never shares a cache between requests. The client reads
 * `queries` one time, when it is built.
 */
export function AppProviders({ queries, children }: AppProvidersProps) {
	const [client] = useState(() => new QueryClient({ defaultOptions: { queries } }))

	return (
		<QueryClientProvider client={client}>
			<UIProvider link={NextLink}>
				<AppearanceProvider>{children}</AppearanceProvider>
			</UIProvider>
		</QueryClientProvider>
	)
}
