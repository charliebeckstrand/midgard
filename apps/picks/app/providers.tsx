'use client'

import type { ReactNode } from 'react'
import { AppProviders } from 'shared/providers'

/**
 * App-wide client providers: `AppProviders` from `shared`. The server renders
 * the dates of the schedule in the zone of the league, and the browser then
 * gives them in the zone of the reader.
 *
 * @remarks Rendered from the root layout.
 */
export function Providers({ children }: { children: ReactNode }) {
	return (
		<AppProviders queries={{ staleTime: 30_000 }} timeZone="America/New_York">
			{children}
		</AppProviders>
	)
}
