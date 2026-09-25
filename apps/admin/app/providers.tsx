'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NextLink from 'next/link'
import { type ReactNode, useState } from 'react'
import { AppearanceProvider } from 'ui/providers/appearance'
import { UIProvider } from 'ui/providers/ui'

/**
 * App-wide client providers: `UIProvider` wired to Next's `Link`,
 * `AppearanceProvider` for the persisted theme and density, and one
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
						// A server page gives each list to its query as `initialData`. With
						// no stale time, the client fetches the same list again at hydration.
						staleTime: 30_000,
					},
				},
			}),
	)

	return (
		<QueryClientProvider client={client}>
			<UIProvider link={NextLink}>
				<AppearanceProvider>{children}</AppearanceProvider>
			</UIProvider>
		</QueryClientProvider>
	)
}
