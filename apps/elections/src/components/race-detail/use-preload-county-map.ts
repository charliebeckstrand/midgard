'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { countyShapesQuery } from '../../queries/county-queries'
import { loadCountyMap } from './load-county-map'

/**
 * Loads the county map of a state in the background while the Drawer shows the
 * state: the chunk of the map and the county shapes of the state. A race of the
 * state then draws its map with no wait for the network.
 *
 * @param state - The lowercase postal code of the state, or `null` for a closed Drawer.
 */
export function usePreloadCountyMap(state: string | null) {
	const queryClient = useQueryClient()

	useEffect(() => {
		if (state === null) return

		void loadCountyMap()

		void queryClient.prefetchQuery(countyShapesQuery(state))
	}, [queryClient, state])
}
