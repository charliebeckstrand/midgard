import createClient from 'openapi-fetch'
import { unwrap } from 'shared/auth'
import type { paths } from 'shared/mimir'
import type { Place, PlaceDraft, VisitScope, Visits } from '../types'

/**
 * The client's whole reach: same-origin `/api/*` paths, per CONVENTIONS §6.3.
 * Nothing else in the app fetches. The places and the visits go through the
 * gateway to Mimir, in asgard, whose spec types {@link mimir}.
 */

/**
 * The typed client of Mimir. The `fetch` is a function and not `fetch` itself,
 * because `openapi-fetch` keeps the `fetch` it gets, and a test stubs the global.
 */
const mimir = createClient<paths>({ fetch: (request) => fetch(request) })

/**
 * The data of a result, or an error with the message of the service. A `401`
 * means that the session ended, so the page also goes to `/login`.
 */
async function settle<Data>(
	result: Promise<{ data?: Data; error?: { message?: string }; response: Response }>,
): Promise<Data> {
	const settled = await result

	if (settled.response.status === 401) window.location.assign('/login')

	return unwrap(Promise.resolve(settled))
}

/** Every stored place, newest visit first. */
export function fetchPlaces(signal?: AbortSignal): Promise<Place[]> {
	return settle(mimir.GET('/api/places', { signal }))
}

/** Adds one place and hands back the stored record, identity and all. */
export function createPlace(draft: PlaceDraft): Promise<Place> {
	return settle(mimir.POST('/api/places', { body: draft }))
}

/** Replaces one place and hands back the stored record. */
export function savePlace(id: string, draft: PlaceDraft): Promise<Place> {
	return settle(mimir.PUT('/api/places/{id}', { params: { path: { id } }, body: draft }))
}

/** Removes one place. */
export async function deletePlace(id: string): Promise<void> {
	await settle(mimir.DELETE('/api/places/{id}', { params: { path: { id } } }))
}

/** Every visited region, by the name its own atlas gives it. */
export function fetchVisits(signal?: AbortSignal): Promise<Visits> {
	return settle(mimir.GET('/api/visits', { signal }))
}

/** Marks one region visited or not, and hands back both scopes. */
export function setVisit(scope: VisitScope, region: string, visited: boolean): Promise<Visits> {
	return settle(
		mimir.PUT('/api/visits/{scope}/{region}', {
			params: { path: { scope, region } },
			body: { visited },
		}),
	)
}
