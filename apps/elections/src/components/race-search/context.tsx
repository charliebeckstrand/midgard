'use client'

import { type ReactNode, useState } from 'react'
import { createContext } from 'ui/core'

/** The state of the search of an election, which the header and the Drawer share. */
export type RaceSearchState = {
	/** Whether the search is open. */
	open: boolean
	setOpen: (open: boolean) => void
	/**
	 * The count of picks in the search. A pick opens the Drawer, and the Drawer
	 * reads a new count as an open from the search.
	 */
	picks: number
	/** Counts a pick. */
	pick: () => void
}

const [RaceSearchContext, useRaceSearch] = createContext<RaceSearchState>('RaceSearch', {
	error: 'useRaceSearch must be used within <RaceSearchProvider>',
})

/**
 * Holds the state of the search of a page for the search in the header and for
 * the Drawer. The Drawer is not inside the search, so the state lives above
 * both. Thus the Drawer can tell an open from the search, and its Back to
 * search can open the search again.
 */
export function RaceSearchProvider({ children }: { children: ReactNode }) {
	const [open, setOpen] = useState(false)

	const [picks, setPicks] = useState(0)

	const value: RaceSearchState = {
		open,
		setOpen,
		picks,
		pick: () => setPicks((count) => count + 1),
	}

	return <RaceSearchContext value={value}>{children}</RaceSearchContext>
}

/** The state of the search of the page, from {@link RaceSearchProvider}. */
export { useRaceSearch }

/**
 * Back to search of the Drawer: a function that closes the Drawer and opens the
 * search again, on the query of the pick. It is `undefined` unless a pick in
 * the search opened the Drawer.
 *
 * A pick counts in the search and moves the Drawer, so a new count while the
 * Drawer is open marks an open from the search. The mark stays while the
 * Drawer moves along its trail, and a close clears it. An open with no pick,
 * such as from the map or a reload, has no mark.
 *
 * @param open - Whether the Drawer is open.
 * @param close - Closes the Drawer.
 */
export function useBackToSearch(open: boolean, close: () => void): (() => void) | undefined {
	const { picks, setOpen } = useRaceSearch()

	const [origin, setOrigin] = useState({ picks, open, search: false })

	const search = open && (origin.picks !== picks || origin.search)

	if (origin.picks !== picks || origin.open !== open) setOrigin({ picks, open, search })

	if (!search) return undefined

	return () => {
		close()

		setOpen(true)
	}
}
