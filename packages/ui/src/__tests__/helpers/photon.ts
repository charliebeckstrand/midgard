import { expect, type Mock, vi } from 'vitest'

/**
 * The Photon fixtures and the `fetch` doubles that the address input suites
 * share. Each stub goes through `vi.stubGlobal`, and `unstubGlobals` reverts it
 * after each test, so a stub does not reach a later file.
 */

/** The signature of `fetch` that the provider calls. */
type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

/** The `fetch` double that the stubs below put on the global. */
export type PhotonFetch = Mock<Fetch>

/** The match for the postal code 97140, as Photon gives it. */
export const SHERWOOD = {
	type: 'Feature',
	geometry: { type: 'Point', coordinates: [-122.85, 45.36] },
	// A postal code carries no OSM object.
	properties: {
		osm_key: 'place',
		osm_value: 'postcode',
		type: 'other',
		name: '97140',
		city: 'Sherwood',
		state: 'Oregon',
		countrycode: 'US',
	},
}

/** A US state with a box, so that the search inside the state runs. */
export const OREGON = {
	type: 'Feature',
	geometry: { type: 'Point', coordinates: [-120.5, 44] },
	properties: {
		osm_id: 165476,
		osm_type: 'R',
		type: 'state',
		name: 'Oregon',
		extent: [-124.7, 46.29, -116.46, 41.99],
	},
}

/** A feature with these properties. It is a node of OSM unless the properties name another object. */
export function makeFeature(
	properties: Record<string, unknown>,
	coordinates: [number, number] = [10, 20],
) {
	return {
		type: 'Feature',
		geometry: { type: 'Point', coordinates },
		properties: { osm_id: 1, osm_type: 'N', ...properties },
	}
}

/** A place in a state, for the searches that read the state of each match. */
export function place(name: string, state: string) {
	return {
		type: 'Feature',
		geometry: { type: 'Point', coordinates: [-122.6, 45.5] },
		properties: { osm_id: name.length + state.length, osm_type: 'N', name, state },
	}
}

/** A Photon response with these features. */
function answer(features: unknown[]): Response {
	return { ok: true, json: async () => ({ features }) } as Response
}

/** The arguments of a request whose URL holds `term`. */
function requestWith(term: string | RegExp) {
	const url = typeof term === 'string' ? expect.stringContaining(term) : expect.stringMatching(term)

	return [url, expect.anything()] as const
}

/** Stubs `fetch` with a double that answers each request with `features`. */
export function stubFeatures(...features: unknown[]): PhotonFetch {
	const fetchMock = vi.fn<Fetch>(async () => answer(features))

	vi.stubGlobal('fetch', fetchMock)

	return fetchMock
}

/** Answers the state request with `OREGON`, and each other request with no matches. */
export function stubEmptyFetch(): PhotonFetch {
	const fetchMock = stubFeatures()

	vi.when(fetchMock)
		.calledWith(...requestWith('layer=state'))
		.thenResolve(answer([OREGON]))

	return fetchMock
}

/** Answers the postal code request with `codes`, and each other request with no matches. */
export function stubPostcode(...codes: unknown[]): PhotonFetch {
	const fetchMock = stubFeatures()

	vi.when(fetchMock)
		.calledWith(...requestWith('osm_tag=place%3Apostcode'))
		.thenResolve(answer(codes))

	return fetchMock
}

/**
 * Answers the state lookup with `area`, the search scoped to the state (by a
 * box or by a point) with `scoped`, and the query as typed with `typed`. Use a
 * provider with no bias, so that only the scoped search carries `lat`.
 */
export function stubState(area: unknown, scoped: unknown[], typed: unknown[]): PhotonFetch {
	const fetchMock = stubFeatures(...typed)

	// The last behavior matches first, so the state lookup wins over the box.
	vi.when(fetchMock)
		.calledWith(...requestWith('bbox='))
		.thenResolve(answer(scoped))
		.calledWith(...requestWith(/[?&]lat=/))
		.thenResolve(answer(scoped))
		.calledWith(...requestWith('layer=state'))
		.thenResolve(answer([area]))

	return fetchMock
}

/** Each URL that the stubbed `fetch` got, as it got it. */
export function requested(fetchMock: PhotonFetch): string[] {
	return fetchMock.mock.calls.map((call) => String(call[0]))
}

/** Each absolute URL that the stubbed `fetch` got, parsed. */
export function requestedUrls(fetchMock: PhotonFetch): URL[] {
	return requested(fetchMock).map((href) => new URL(href))
}
