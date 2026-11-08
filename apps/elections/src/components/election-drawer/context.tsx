'use client'

import type { ReactNode } from 'react'
import { createContext } from 'ui/core'
import type { OfficeRaces } from '../../utilities/results'

const [ElectionRacesContext, useElectionRaces] = createContext<readonly OfficeRaces[]>(
	'ElectionRaces',
	{ error: 'useElectionRaces must be used within <ElectionRacesProvider>' },
)

/**
 * Gives the races of each office of an election to the Drawer of each page of
 * the election. The layout of the election reads the races, so a navigation
 * between its pages does not send them again.
 */
export function ElectionRacesProvider({
	races,
	children,
}: {
	/** The races of each office, in the order of the registry. */
	races: readonly OfficeRaces[]
	children: ReactNode
}) {
	return <ElectionRacesContext value={races}>{children}</ElectionRacesContext>
}

/** The races of each office of the election, from {@link ElectionRacesProvider}. */
export { useElectionRaces }
