'use client'

import type { ReactNode } from 'react'
import { SecondStepDialog } from 'shared/auth'
import { AppProviders } from 'shared/providers'

/** The default format of a date: `Oct 6, 2026, 12:40 PM`. */
const dateFormat: Intl.DateTimeFormatOptions = {
	year: 'numeric',
	month: 'short',
	day: 'numeric',
	hour: 'numeric',
	minute: '2-digit',
}

/**
 * App-wide client providers: `AppProviders` from `shared`, and the
 * `SecondStepDialog` that asks for the second step when a request needs it.
 *
 * @remarks Rendered from the root layout.
 */
export function Providers({ children }: { children: ReactNode }) {
	return (
		// A server page seeds each list into its query (see `seededQuery`). With
		// no stale time, the client fetches the same list again at hydration.
		<AppProviders queries={{ staleTime: 30_000 }} dateFormat={dateFormat}>
			{children}
			<SecondStepDialog />
		</AppProviders>
	)
}
