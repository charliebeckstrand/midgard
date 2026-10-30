'use client'

import type { ReactNode } from 'react'
import { AppProviders } from 'shared/providers'

/**
 * App-wide client providers: `AppProviders` from `shared`.
 *
 * @remarks Rendered from the root layout.
 */
export function Providers({ children }: { children: ReactNode }) {
	return (
		// A server page seeds each list into its query (see `seededQuery`). With
		// no stale time, the client fetches the same list again at hydration.
		<AppProviders queries={{ staleTime: 30_000 }}>{children}</AppProviders>
	)
}
