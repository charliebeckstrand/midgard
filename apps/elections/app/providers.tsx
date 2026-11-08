'use client'

import type { ReactNode } from 'react'
import { AppProviders } from 'shared/providers'

/**
 * App-wide client providers: `AppProviders` from `shared`. It sets no time
 * zone, so the times of the calls are in the zone of the reader.
 *
 * @remarks Rendered from the root layout.
 */
export function Providers({ children }: { children: ReactNode }) {
	return (
		// A page seeds the race of the Drawer into its query (see `seededQuery`).
		// With no stale time, the client fetches the same race again at hydration.
		<AppProviders queries={{ staleTime: 30_000 }}>{children}</AppProviders>
	)
}
