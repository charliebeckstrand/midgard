import type { MapTopology } from 'ui/modules/map'
import type { Place, PlaceDraft } from '../types'

/**
 * The client's whole reach: same-origin `/api/*` paths, per CONVENTIONS §6.3.
 * Nothing else in the app fetches, so replacing the store behind these routes
 * replaces the app's data source.
 */

/** What a route answers with when it rejects a body. */
type IssuesResponse = { issues?: unknown }

/** Reads the reasons a request failed, for a message the reader can act on. */
async function failureText(response: Response): Promise<string> {
	try {
		const body = (await response.json()) as IssuesResponse

		if (Array.isArray(body.issues)) return body.issues.map(String).join(' ')
	} catch {
		// A non-JSON error body says nothing useful; the status does.
	}

	return `Request failed: ${response.status}`
}

/**
 * One same-origin request, checked and parsed.
 *
 * Every call below goes through it, so the ok-check happens once rather than
 * seven times — an unchecked response is the failure that shows up as a parse
 * error three layers away, and the seventh copy is the one that forgets.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(path, init)

	if (!response.ok) throw new Error(await failureText(response))

	return (await response.json()) as T
}

/** The same, for a request that writes JSON and reads the stored record back. */
function send<T>(path: string, method: string, body: unknown): Promise<T> {
	return request<T>(path, {
		method,
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body),
	})
}

/** Every stored place, newest visit first. */
export function fetchPlaces(signal?: AbortSignal): Promise<Place[]> {
	return request<Place[]>('/api/places', { signal })
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
	const response = await fetch(`/api/places/${encodeURIComponent(id)}`, { method: 'DELETE' })

	if (!response.ok) throw new Error(await failureText(response))
}

/** Every visited state, by the name the atlas gives it. */
export function fetchVisits(signal?: AbortSignal): Promise<string[]> {
	return request<string[]>('/api/visits', { signal })
}

/** Marks one state visited or not, and hands back the whole set. */
export function setVisit(state: string, visited: boolean): Promise<string[]> {
	return send<string[]>(`/api/visits/${encodeURIComponent(state)}`, 'PUT', { visited })
}

/** The US states atlas the map draws, as a TopoJSON topology. */
export function fetchStatesAtlas(signal?: AbortSignal): Promise<MapTopology> {
	return request<MapTopology>('/api/atlas/states', { signal })
}
