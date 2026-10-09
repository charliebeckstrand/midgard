import { unwrap } from 'shared/auth'
import { createMimirClient } from 'shared/mimir'
import type { Place, PlaceDraft, VisitScope, Visits } from '../types'

/**
 * The client's whole reach: same-origin `/api/*` paths, per CONVENTIONS §6.3.
 * Nothing else in the app fetches. The places and the visits go through the
 * gateway to Mimir, in asgard, whose spec types {@link mimir}.
 */

const mimir = createMimirClient()

/** Every stored place, newest visit first. */
export function fetchPlaces(signal?: AbortSignal): Promise<Place[]> {
	return unwrap(mimir.GET('/api/places', { signal }))
}

/** Adds one place and hands back the stored record, identity and all. */
export function createPlace(draft: PlaceDraft): Promise<Place> {
	return unwrap(mimir.POST('/api/places', { body: draft }))
}

/** Replaces one place and hands back the stored record. */
export function savePlace(id: string, draft: PlaceDraft): Promise<Place> {
	return unwrap(mimir.PUT('/api/places/{id}', { params: { path: { id } }, body: draft }))
}

/** Removes one place. */
export async function deletePlace(id: string): Promise<void> {
	await unwrap(mimir.DELETE('/api/places/{id}', { params: { path: { id } } }))
}

/** Every visited region, by the name its own atlas gives it. */
export function fetchVisits(signal?: AbortSignal): Promise<Visits> {
	return unwrap(mimir.GET('/api/visits', { signal }))
}

/** Marks one region visited or not, and hands back both scopes. */
export function setVisit(scope: VisitScope, region: string, visited: boolean): Promise<Visits> {
	return unwrap(
		mimir.PUT('/api/visits/{scope}/{region}', {
			params: { path: { scope, region } },
			body: { visited },
		}),
	)
}
