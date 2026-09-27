'use client'

import type { ReactNode } from 'react'
import { SecondStepDialog } from 'shared/auth'
import { AppProviders } from 'shared/providers'

/**
 * App-wide client providers: `AppProviders` from `shared`, and the
 * `SecondStepDialog` that asks for the second step when a request needs it.
 *
 * @remarks Rendered from the root layout.
 */
export function Providers({ children }: { children: ReactNode }) {
	return (
		// A server page gives each list to its query as `initialData`. With no
		// stale time, the client fetches the same list again at hydration.
		<AppProviders queries={{ staleTime: 30_000 }}>
			{children}
			<SecondStepDialog />
		</AppProviders>
	)
}
