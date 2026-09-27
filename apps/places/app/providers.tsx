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
		// The atlas is the reason for both: it never changes, and it costs a
		// megabyte to fetch. A window focus must not go and get it again.
		<AppProviders queries={{ staleTime: 30_000, refetchOnWindowFocus: false }}>
			{children}
		</AppProviders>
	)
}
