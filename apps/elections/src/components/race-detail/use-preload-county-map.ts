'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { MapFeatureCollection } from 'ui/map'
import { countyShapesQuery } from '../../queries/county-queries'
import { loadCountyMap } from './load-county-map'

/**
 * Loads the county map of a state in the background while the Drawer shows the
 * state: the chunk of the map and the county shapes of the state. A race of the
 * state then draws its map with no wait for the network.
 *
 * Shapes that the page read on the server fill the entry with no read, as the
 * map does with them (`useCountyShapes`). The preload can run before the map
 * mounts, so it must not read the shapes that the first paint drew.
 *
 * @param state - The lowercase postal code of the state, or `null` for a closed Drawer.
 * @param shapes - The county shapes of the state that the page read on the server, or `null`.
 */
export function usePreloadCountyMap(state: string | null, shapes: MapFeatureCollection | null) {
	const queryClient = useQueryClient()

	useEffect(() => {
		if (state === null) return

		void loadCountyMap()

		void queryClient.prefetchQuery({
			...countyShapesQuery(state),
			initialData: shapes ?? undefined,
		})
	}, [queryClient, state, shapes])
}
