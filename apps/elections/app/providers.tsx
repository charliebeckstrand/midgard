'use client'

import type { ReactNode } from 'react'
import { AppProviders } from 'shared/providers'

/**
 * App-wide client providers: `AppProviders` from `shared`. It sets no time
 * zone, so the times of the calls are in the zone of the reader.
 *
 * @remarks Rendered from the root layout. The app has no client queries, so
 * the query defaults are the defaults of `shared`.
 */
export function Providers({ children }: { children: ReactNode }) {
	return <AppProviders>{children}</AppProviders>
}
