import { createRequest } from 'shared/http'
import type { MapTopology } from 'ui/modules/map'
import type { Place, PlaceDraft, VisitScope, Visits } from '../types'

/**
 * The client's whole reach: same-origin `/api/*` paths, per CONVENTIONS §6.3.
 * Nothing else in the app fetches, so replacing the store behind these routes
 * replaces the app's data source.
 */

/**
 * The checked requests of the app. A `401` means that the session ended, so the
 * page also goes to `/login`. A refused body's `issues` become the message of
 * the error.
 */
const { request, json, send } = createRequest({
	onUnauthorized: () => window.location.assign('/login'),
})

/** Every stored place, newest visit first. */
export function fetchPlaces(signal?: AbortSignal): Promise<Place[]> {
	return json<Place[]>('/api/places', { signal })
}

/** Adds one place and hands back the stored record, identity and all. */
export function createPlace(draft: PlaceDraft): Promise<Place> {
	return send<Place>('/api/places', 'POST', draft)
}

/** Replaces one place and hands back the stored record. */
export function savePlace(id: string, draft: PlaceDraft): Promise<Place> {
	return send<Place>(`/api/places/${encodeURIComponent(id)}`, 'PUT', draft)
}

/** Removes one place. */
export async function deletePlace(id: string): Promise<void> {
	// The route answers 204, which carries no body to parse.
	await request(`/api/places/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** Every visited region, by the name its own atlas gives it. */
export function fetchVisits(signal?: AbortSignal): Promise<Visits> {
	return json<Visits>('/api/visits', { signal })
}

/** Marks one region visited or not, and hands back both scopes. */
export function setVisit(scope: VisitScope, region: string, visited: boolean): Promise<Visits> {
	return send<Visits>(`/api/visits/${scope}/${encodeURIComponent(region)}`, 'PUT', { visited })
}

/**
 * One atlas the map draws, as a TopoJSON topology.
 *
 * The scope names the route as well as the grain, so the two atlases are one
 * call rather than one function each — and the same word names the topology
 * object to decode out of what comes back.
 */
export function fetchAtlas(scope: VisitScope, signal?: AbortSignal): Promise<MapTopology> {
	return json<MapTopology>(`/api/atlas/${scope}`, { signal })
}
