'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NextLink from 'next/link'
import { type ReactNode, useState } from 'react'
import { UIProvider } from 'ui/providers/ui'

/**
 * App-wide client providers: `UIProvider` wired to Next's `Link`, and one
 * `QueryClient` for the whole app.
 *
 * @remarks Top-level context per CONVENTIONS.md §6.1; rendered from the root
 * layout. The client is built in state rather than at module scope, so a render
 * on the server never shares a cache between requests.
 */
export function Providers({ children }: { children: ReactNode }) {
	const [client] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						// The atlas is the reason for both: it never changes, and it costs
						// a megabyte to fetch. A window focus must not go and get it again.
						staleTime: 30_000,
						refetchOnWindowFocus: false,
					},
				},
			}),
	)

	return (
		<QueryClientProvider client={client}>
			<UIProvider link={NextLink}>{children}</UIProvider>
		</QueryClientProvider>
	)
}
