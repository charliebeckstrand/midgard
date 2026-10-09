'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type Seed, seededQuery } from 'shared/queries'
import {
	createPlace,
	deletePlace,
	fetchPlaces,
	fetchVisits,
	savePlace,
	setVisit,
} from '../api/places-api'
import { flags } from '../flags'
import type { Place, PlaceDraft, VisitScope, Visits } from '../types'

/**
 * The query keys, in one place. Both a reader and a writer name the places
 * entry, and an invalidation that spelled the key a second way would refresh
 * nothing.
 */
export const placesKeys = {
	all: ['places'] as const,
	visits: ['visits'] as const,
}

/**
 * Every stored place.
 *
 * `initial` is the list that the page read on the server (see `seededQuery`).
 * It fills the cache before the first render, so the filter bar is there on the
 * first paint, and the map does not change size when the list lands. The query
 * refetches it when it goes stale, as with any other entry.
 */
export function usePlaces(initial: Seed<Place[]>) {
	return useQuery({
		queryKey: placesKeys.all,
		queryFn: ({ signal }) => fetchPlaces(signal),
		...seededQuery(initial),
	})
}

/**
 * Every visited region, in both scopes.
 *
 * Its own query rather than a field on the places: a region is visited whether
 * or not anything was recorded in it, so nothing about this set can be read off
 * the other one.
 *
 * `initial` is the set that the page read on the server (see `seededQuery`). It fills the cache
 * before the first render, so the Visited toggle paints its true state on the
 * first frame. Without it, the toggle paints as not visited until the fetch
 * lands. The query refetches it when it goes stale, as with any other entry.
 */
export function useVisits(initial: Seed<Visits>) {
	return useQuery({
		queryKey: placesKeys.visits,
		queryFn: ({ signal }) => fetchVisits(signal),
		...seededQuery(initial),
		// Nothing reads the set while the visited regions feature is off.
		enabled: flags.visitedRegions,
	})
}

/**
 * Marks one region visited or not. The route answers with both scopes, so the
 * cache takes what the store settled on rather than a copy patched here — which
 * is what makes the first write of a seeded file land whole.
 */
export function useSetVisit() {
	const client = useQueryClient()

	return useMutation({
		mutationFn: ({
			scope,
			region,
			visited,
		}: {
			scope: VisitScope
			region: string
			visited: boolean
		}) => setVisit(scope, region, visited),
		onSuccess: (visits) => {
			client.setQueryData<Visits>(placesKeys.visits, visits)
		},
	})
}

/**
 * Adds a place and puts it straight into the cached list, so the new point is on
 * the map by the time the drawer closes.
 *
 * No refetch behind it: the route answers with the stored record, so the cache
 * already holds what a re-read would return. The refetch would also land a new
 * array identity, and every derived value hangs off that one — the state
 * grouping walks `geoContains` over 56 features per place, and the map
 * re-clusters and re-projects every dot behind it.
 */
export function useAddPlace() {
	const client = useQueryClient()

	return useMutation({
		mutationFn: (draft: PlaceDraft) => createPlace(draft),
		onSuccess: (place) => {
			client.setQueryData<Place[]>(placesKeys.all, (places) => [place, ...(places ?? [])])
		},
	})
}

/**
 * Replaces a place and writes the stored record straight into the cached list,
 * so the map and the open panel show the edit before the refetch lands.
 */
export function useSavePlace() {
	const client = useQueryClient()

	return useMutation({
		mutationFn: ({ id, draft }: { id: string; draft: PlaceDraft }) => savePlace(id, draft),
		onSuccess: (place) => {
			client.setQueryData<Place[]>(placesKeys.all, (places) =>
				(places ?? []).map((held) => (held.id === place.id ? place : held)),
			)
		},
	})
}

/**
 * Removes a place and drops it from the cached list at once, so the dot leaves
 * the map with the panel that deleted it rather than a round trip later.
 */
export function useDeletePlace() {
	const client = useQueryClient()

	return useMutation({
		mutationFn: (id: string) => deletePlace(id),
		onSuccess: (_result, id) => {
			client.setQueryData<Place[]>(placesKeys.all, (places) =>
				(places ?? []).filter((place) => place.id !== id),
			)
		},
	})
}
