'use client'

import {
	mutationOptions,
	type QueryClient,
	useMutation,
	useQuery,
	useQueryClient,
} from '@tanstack/react-query'
import { type Seed, seededQuery } from 'shared/queries'
import {
	createPlace,
	createTrip,
	deletePlace,
	deleteTrip,
	fetchPlaces,
	fetchTrips,
	fetchVisits,
	savePlace,
	saveTrip,
	setVisit,
} from '../api/places-api'
import { flags } from '../flags'
import type {
	Place,
	PlaceDraft,
	Trip,
	TripDraft,
	TripStop,
	Visit,
	VisitScope,
	Visits,
} from '../types'
import { placeDraft } from '../utilities/places-visits'

/**
 * The query keys, in one place. Both a reader and a writer name the places
 * entry, and an invalidation that spelled the key a second way would refresh
 * nothing.
 */
export const placesKeys = {
	all: ['places'] as const,
	trips: ['trips'] as const,
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
 * Every stored trip. `initial` is the list that the page read on the server, for
 * the same reason the places are: the Show filter, My trips, and the trip squares
 * must be right on the first paint.
 */
export function useTrips(initial: Seed<Trip[]>) {
	return useQuery({
		queryKey: placesKeys.trips,
		queryFn: ({ signal }) => fetchTrips(signal),
		...seededQuery(initial),
	})
}

/**
 * `written` merged into a cached list: a stored record takes the position of
 * its old copy, and a new one goes first, as a new record does on an add.
 */
export function mergeById<T extends { id: string }>(
	held: readonly T[] | undefined,
	written: readonly T[],
): T[] {
	const list = held ?? []

	const byId = new Map(written.map((record) => [record.id, record]))

	const kept = list.map((record) => byId.get(record.id) ?? record)

	const known = new Set(list.map((record) => record.id))

	return [...written.filter((record) => !known.has(record.id)), ...kept]
}

/**
 * Adds a trip with its stops. The route answers with the trip and every place
 * its stops wrote, so both cached lists take the stored records without a
 * refetch.
 */
export function useAddTrip() {
	const client = useQueryClient()

	return useMutation({
		mutationFn: ({ draft, stops }: { draft: TripDraft; stops: TripStop[] }) =>
			createTrip(draft, stops),
		// The form shows the error.
		meta: { inlineError: true },
		onSuccess: ({ trip, places }) => {
			client.setQueryData<Trip[]>(placesKeys.trips, (trips) => mergeById(trips, [trip]))

			client.setQueryData<Place[]>(placesKeys.all, (held) => mergeById(held, places))
		},
	})
}

/** Replaces the fields of a trip from the form, and writes the stored record into the cached list. */
export function useSaveTrip() {
	const client = useQueryClient()

	return useMutation({
		mutationFn: ({ id, draft }: { id: string; draft: TripDraft }) => saveTrip(id, draft),
		// The form shows the error.
		meta: { inlineError: true },
		onSuccess: (trip) => {
			client.setQueryData<Trip[]>(placesKeys.trips, (trips) => mergeById(trips, [trip]))
		},
	})
}

/** A visit with its link to a trip cleared. */
function unlinked({ tripId: _tripId, ...visit }: Visit): Visit {
	return visit
}

/**
 * Removes a trip. Mimir keeps its places and their visits and clears the link,
 * so the cache clears `tripId` on those visits the same way.
 */
export function useDeleteTrip() {
	const client = useQueryClient()

	return useMutation({
		mutationFn: (id: string) => deleteTrip(id),
		onSuccess: (_result, id) => {
			client.setQueryData<Trip[]>(placesKeys.trips, (trips) =>
				(trips ?? []).filter((trip) => trip.id !== id),
			)

			client.setQueryData<Place[]>(placesKeys.all, (places) =>
				(places ?? []).map((place) =>
					place.visits.some((visit) => visit.tripId === id)
						? {
								...place,
								visits: place.visits.map((visit) =>
									visit.tripId === id ? unlinked(visit) : visit,
								),
							}
						: place,
				),
			)
		},
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

type VisitMark = { scope: VisitScope; region: string; visited: boolean }

/**
 * Marks one region visited or not. The cache takes the mark at once, so the
 * toggle shows it on the press, and a second press reads the first one. A
 * failure puts back the set from before the press.
 *
 * The route answers with both scopes, so the cache then takes what the store
 * settled on rather than a copy patched here — which is what makes the first
 * write of a seeded file land whole.
 */
export function setVisitMutation(client: QueryClient) {
	return mutationOptions({
		mutationFn: ({ scope, region, visited }: VisitMark) => setVisit(scope, region, visited),
		onMutate: async ({ scope, region, visited }: VisitMark) => {
			// A refetch that lands after the mark would overwrite it.
			await client.cancelQueries({ queryKey: placesKeys.visits })

			const before = client.getQueryData<Visits>(placesKeys.visits)

			if (before !== undefined) {
				const others = before[scope].filter((held) => held !== region)

				client.setQueryData<Visits>(placesKeys.visits, {
					...before,
					[scope]: visited ? [...others, region] : others,
				})
			}

			return { before }
		},
		onError: (_error, _mark, context) => {
			if (context?.before !== undefined) client.setQueryData(placesKeys.visits, context.before)
		},
		onSuccess: (visits) => {
			client.setQueryData<Visits>(placesKeys.visits, visits)
		},
	})
}

/** {@link setVisitMutation} on the client of the app. */
export function useSetVisit() {
	return useMutation(setVisitMutation(useQueryClient()))
}

/**
 * Adds a place from the form, and puts it straight into the cached list, so the new point is on
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
		// The form shows the error.
		meta: { inlineError: true },
		onSuccess: (place) => {
			client.setQueryData<Place[]>(placesKeys.all, (places) => mergeById(places, [place]))
		},
	})
}

/**
 * Replaces a place from the form, and writes the stored record straight into the cached list,
 * so the map and the open panel show the edit before the refetch lands.
 */
export function useSavePlace() {
	const client = useQueryClient()

	return useMutation({
		mutationFn: ({ id, draft }: { id: string; draft: PlaceDraft }) => savePlace(id, draft),
		// The form shows the error.
		meta: { inlineError: true },
		onSuccess: (place) => {
			client.setQueryData<Place[]>(placesKeys.all, (places) => mergeById(places, [place]))
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

/**
 * Removes one visit of a place, and writes the stored record into the cached
 * list. A failure shows in a toast, because the confirm that asked for the
 * removal is closed.
 */
export function useDeleteVisit() {
	const client = useQueryClient()

	return useMutation({
		mutationFn: ({ place, visit }: { place: Place; visit: Visit }) =>
			savePlace(
				place.id,
				placeDraft({ ...place, visits: place.visits.filter((held) => held.id !== visit.id) }),
			),
		onSuccess: (place) => {
			client.setQueryData<Place[]>(placesKeys.all, (places) => mergeById(places, [place]))
		},
	})
}
