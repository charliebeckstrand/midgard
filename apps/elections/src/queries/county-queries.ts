'use client'

import { queryOptions, useQuery } from '@tanstack/react-query'
import type { MapFeatureCollection } from 'ui/map'
import { fetchCountyShapes } from '../api/county-api'

/**
 * The read of the county shapes of a state. The shapes do not change while the
 * app runs, so a state reads them once. The Drawer prefetches them with the
 * same options when it opens on the state.
 *
 * @param state - The lowercase postal code of the state, such as `ga`.
 */
export function countyShapesQuery(state: string) {
	return queryOptions({
		queryKey: ['county-shapes', state],
		queryFn: ({ signal }) => fetchCountyShapes(state, signal),
		staleTime: Number.POSITIVE_INFINITY,
	})
}

/**
 * The county shapes of a state, for the county map of the Drawer and of the
 * page of the state. The shapes do not change while the app runs, so shapes
 * that the page read on the server fill the entry with no read.
 *
 * @param state - The lowercase postal code of the state, such as `ga`.
 * @param seed - The shapes of the state that the page read on the server, or `null`.
 */
export function useCountyShapes(state: string, seed: MapFeatureCollection | null = null) {
	return useQuery({ ...countyShapesQuery(state), initialData: seed ?? undefined })
}
