'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	createPlace,
	deletePlace,
	fetchCountriesAtlas,
	fetchPlaces,
	fetchStatesAtlas,
	fetchVisits,
	savePlace,
	setVisit,
} from '../api/places-api'
import type { Place, PlaceDraft, VisitScope, Visits } from '../types'
import { decodeRegions } from '../utilities/places-geography'
import type { PlaceAtlas } from '../utilities/places-view'

/**
 * The query keys, in one place. Both a reader and a writer name the places
 * entry, and an invalidation that spelled the key a second way would refresh
 * nothing.
 */
export const placesKeys = {
	all: ['places'] as const,
	atlas: (atlas: PlaceAtlas) => ['atlas', atlas] as const,
	visits: ['visits'] as const,
}

/** Every stored place. */
export function usePlaces() {
	return useQuery({
		queryKey: placesKeys.all,
		queryFn: ({ signal }) => fetchPlaces(signal),
	})
}

/**
 * The regions the map draws, per atlas; `undefined` while they load, which the
 * map takes as "reserve the frame and draw nothing yet".
 *
 * Decoded inside the query rather than at the call site. The cache holds this
 * entry for the tab's life, and nothing reads the topology once the features are
 * out of it — cached whole, the raw atlas would be pinned for the session beside
 * what it decodes to. It also takes the decode off the render path.
 *
 * Both atlases are published data that never changes, so neither restales and no
 * refetch ever asks for one twice. Keyed by atlas, so the two are held apart.
 *
 * `enabled` is what keeps the second atlas off the wire: a reader whose places
 * are all inside the United States never opens a view that draws countries, and
 * must not pay 108 kB for one. Once fetched it is held for the tab's life, so a
 * reader who goes out to the world and back in fetches it once.
 */
export function useAtlas(atlas: PlaceAtlas, enabled = true) {
	return useQuery({
		queryKey: placesKeys.atlas(atlas),
		queryFn: async ({ signal }) =>
			atlas === 'states'
				? decodeRegions(await fetchStatesAtlas(signal), 'states')
				: decodeRegions(await fetchCountriesAtlas(signal), 'countries'),
		enabled,
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: Number.POSITIVE_INFINITY,
	})
}

/**
 * Every visited region, in both scopes.
 *
 * Its own query rather than a field on the places: a region is visited whether
 * or not anything was recorded in it, so nothing about this set can be read off
 * the other one.
 */
export function useVisits() {
	return useQuery({
		queryKey: placesKeys.visits,
		queryFn: ({ signal }) => fetchVisits(signal),
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
