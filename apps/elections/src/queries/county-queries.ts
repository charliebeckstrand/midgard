'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchCountyShapes } from '../api/county-api'

/**
 * The county shapes of a state, for the county map of the Drawer. The shapes
 * do not change while the app runs, so a state reads them once.
 *
 * @param state - The lowercase postal code of the state, such as `ga`.
 */
export function useCountyShapes(state: string) {
	return useQuery({
		queryKey: ['county-shapes', state],
		queryFn: ({ signal }) => fetchCountyShapes(state, signal),
		staleTime: Number.POSITIVE_INFINITY,
	})
}
