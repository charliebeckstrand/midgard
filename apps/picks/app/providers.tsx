'use client'

import type { ReactNode } from 'react'
import { AppProviders } from 'shared/providers'

/**
 * App-wide client providers: `AppProviders` from `shared`.
 *
 * @remarks Rendered from the root layout.
 */
export function Providers({ children }: { children: ReactNode }) {
	return <AppProviders queries={{ staleTime: 30_000 }}>{children}</AppProviders>
}
