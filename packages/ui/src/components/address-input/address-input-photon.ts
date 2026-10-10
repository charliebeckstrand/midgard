import { compact, splitPostcode, splitUsState, type UsState } from './address-input-photon-query'
import type { AddressParts, AddressProvider, AddressSuggestion } from './types'

type PhotonFeature = {
	type: 'Feature'
	geometry: { type: 'Point'; coordinates: [number, number] }
	properties: {
		/**
		 * The OSM object. Absent on a postal code, which Photon builds from the
		 * addresses that carry it and not from one object.
		 */
		osm_id?: number
		osm_type?: string
		/** What the match stands for: `house`, `street`, `city`, `other`. */
		type?: string
		/** The OSM key and value, such as `place` and `postcode` for a postal code. */
		osm_key?: string
		osm_value?: string
		/** The ISO 3166-1 alpha-2 code of the country, in capitals. */
		countrycode?: string
		/** The box of an area: west, north, east, south. */
		extent?: unknown
		name?: string
		housenumber?: string
		street?: string
		city?: string
		state?: string
		country?: string
		postcode?: string
	}
}

type PhotonResponse = { features: PhotonFeature[] }

function isPhotonFeature(value: unknown): value is PhotonFeature {
	if (typeof value !== 'object' || value === null) return false

	const f = value as { geometry?: unknown; properties?: unknown }

	if (typeof f.geometry !== 'object' || f.geometry === null) return false

	const coords = (f.geometry as { coordinates?: unknown }).coordinates

	if (
		!Array.isArray(coords) ||
		coords.length !== 2 ||
		typeof coords[0] !== 'number' ||
		typeof coords[1] !== 'number'
	) {
		return false
	}

	if (typeof f.properties !== 'object' || f.properties === null) return false

	const p = f.properties as { osm_id?: unknown; osm_type?: unknown }

	return (
		(p.osm_id === undefined || typeof p.osm_id === 'number') &&
		(p.osm_type === undefined || typeof p.osm_type === 'string')
	)
}

function isPhotonResponse(value: unknown): value is PhotonResponse {
	if (typeof value !== 'object' || value === null) return false

	const features = (value as { features?: unknown }).features

	return Array.isArray(features) && features.every(isPhotonFeature)
}

const PHOTON_ENDPOINT = 'https://photon.komoot.io/api/'

const DEFAULT_LIMIT = 5

/**
 * A Photon layer: which kind of thing a match stands for. `house` is a street
 * address, `street` a whole road, and the rest are areas of rising size.
 *
 * Photon returns businesses and named places without a layer of their own, so
 * there is no layer to filter a business search down to. A business search asks
 * for the name and reads the name back ({@link AddressSuggestion.name}). Use
 * this to narrow the other way. `['house']` suits a field that must resolve to a
 * doorstep, `['city']` one that picks a market.
 */
export type PhotonLayer =
	| 'house'
	| 'street'
	| 'locality'
	| 'district'
	| 'city'
	| 'county'
	| 'state'
	| 'country'

/** Options for {@link createPhotonProvider}. */
export type PhotonProviderOptions = {
	/**
	 * The Photon instance to query. Point it at your own where the public one's
	 * rate limit or its terms do not suit.
	 * @defaultValue the public Komoot endpoint.
	 */
	endpoint?: string
	/**
	 * Matches to ask for.
	 * @defaultValue 5
	 */
	limit?: number
	/**
	 * Language for the returned names; the instance's default otherwise. The
	 * search inside a US state asks for no language, because it keeps the
	 * matches by the English name of the state.
	 */
	lang?: string
	/**
	 * Rank matches near this point first. A geocoder asked for "Clearwater" with
	 * no bias answers with the largest match on the planet. A field that knows
	 * roughly where its reader is must therefore say so. That is the map's own
	 * center, or a coarse location the reader already gave.
	 */
	bias?: { latitude: number; longitude: number }
	/** Keep only these layers; every layer otherwise. See {@link PhotonLayer}. */
	layers?: PhotonLayer[]
	/**
	 * The country in which a postal code in the query is read, as an ISO 3166-1
	 * alpha-2 code. See {@link createPhotonProvider} for how the query reads a
	 * postal code.
	 *
	 * A postal code is not unique across countries: 97140 is Sherwood, Oregon,
	 * and also Rovaniemi, Finland. When a region is set, a code that has no match
	 * in that region is not read as a postal code. When no region is known, the
	 * geocoder's first match is the one used.
	 * @defaultValue the region of the browser's language, such as `US` for `en-US`.
	 */
	region?: string
	/**
	 * Keep only matches carrying these OpenStreetMap tags, in Photon's own
	 * `key:value` form (`'amenity:restaurant'`), with a leading `!` to exclude.
	 * The narrow instrument behind {@link layers}: a field that only ever wants
	 * restaurants asks for the tag.
	 */
	osmTag?: string[]
}

/** Whether the name of a match holds the full name of a state, as a whole word. */
function namesState(feature: PhotonFeature, state: UsState): boolean {
	const words = ` ${(feature.properties.name ?? '').toLowerCase().replace(/[^a-z]+/g, ' ')} `

	return words.includes(` ${state.name.toLowerCase()} `)
}

/**
 * A Photon extent as the `bbox` parameter takes it: west, south, east, north.
 * `undefined` where the extent is not four numbers.
 */
function boxOf(extent: unknown): [number, number, number, number] | undefined {
	if (!Array.isArray(extent) || extent.length !== 4) return undefined

	if (!extent.every((value) => typeof value === 'number')) return undefined

	const [west, north, east, south] = extent as number[]

	return [west as number, south as number, east as number, north as number]
}

/** The region of the browser's language, or `undefined` where there is no browser or no region. */
function browserRegion(): string | undefined {
	if (typeof navigator === 'undefined' || !navigator.language) return undefined

	try {
		return new Intl.Locale(navigator.language).maximize().region
	} catch {
		return undefined
	}
}

/**
 * Build an {@link AddressProvider} over a Photon geocoder.
 *
 * A match that names a business or a place leads with that name and carries the
 * address as its description. A reader searching "Clearwater Restaurant"
 * therefore reads the restaurant back, rather than the street it stands on. A plain address
 * leads with the street line, as it always did. Either way the parts come back
 * in {@link AddressSuggestion.address} and the position in `latitude` /
 * `longitude`.
 *
 * A query that ends in a postal code searches near that code. Without this
 * step, "ice cream 97140" answers with ice cream in other states. The provider
 * finds the position of the code first, then searches the query with that
 * position as the proximity bias. The code stays in the query, because an
 * address holds its code: "11530 SW Pacific Hwy, Tigard, OR" matches nothing
 * without "97223". A ZIP+4 is searched as its first five digits. A query that
 * is only a code answers with that code. With `layers` or `osmTag`, it searches
 * the code near that position instead, so the filters apply. A query that ends
 * in a code that the geocoder does not know is searched as typed.
 *
 * Where the region is `US`, a query that ends in a state searches inside that
 * state. A full name matches in any case, and a USPS code only in capitals, so
 * "starbucks Oregon" and "starbucks OR" search Oregon. The query as typed wins
 * where the state has no match. It also wins where one of its matches holds the
 * state in its name, as "Mount Washington" does. The search inside the state
 * asks for no language, because it keeps the matches by the English name of
 * the state. See {@link PhotonProviderOptions.region} for the country a code is
 * read in.
 *
 * @param options - Endpoint, result count, language, proximity bias, postal
 * code region, and the layer / tag filters; see {@link PhotonProviderOptions}.
 * @returns A provider to hand `AddressInput`.
 * @remarks Throws on a non-OK status or an unexpected response shape. A query
 * that ends in a postal code costs one more request, and a state two more.
 * @example
 * ```tsx
 * const nearby = createPhotonProvider({ bias: { latitude: 44.6, longitude: -124.05 } })
 *
 * <AddressInput provider={nearby} placeholder="Search for a place" />
 * ```
 */
export function createPhotonProvider(options: PhotonProviderOptions = {}): AddressProvider {
	const { endpoint = PHOTON_ENDPOINT, limit = DEFAULT_LIMIT, lang, bias, layers, osmTag } = options

	async function request(params: URLSearchParams, signal: AbortSignal): Promise<PhotonFeature[]> {
		const response = await fetch(`${endpoint}?${params}`, { signal })

		if (!response.ok) throw new Error(`Photon request failed: ${response.status}`)

		const data: unknown = await response.json()

		if (!isPhotonResponse(data)) throw new Error('Photon response did not match expected shape')

		return data.features
	}

	/** The match for a postal code, or `undefined` where the geocoder has no such code. */
	async function findPostcode(
		postcode: string,
		region: string | undefined,
		signal: AbortSignal,
	): Promise<PhotonFeature | undefined> {
		const params = new URLSearchParams({ q: postcode, limit: '5', osm_tag: 'place:postcode' })

		if (region !== undefined) params.set('countrycode', region)

		const features = await request(params, signal)

		// The geocoder matches loosely, so "97140" can answer with 97141. Only a
		// code that is the typed code is its position.
		return features.find(
			(feature) =>
				feature.properties.osm_value === 'postcode' &&
				compact(feature.properties.name ?? '') === compact(postcode),
		)
	}

	/**
	 * Where a search looks: near a point, or only inside a box. `localize: false`
	 * asks for no language, whatever `lang` is.
	 */
	type Scope = {
		near?: PhotonProviderOptions['bias']
		box?: [number, number, number, number]
		localize?: boolean
	}

	function search(query: string, scope: Scope, signal: AbortSignal) {
		const params = new URLSearchParams({ q: query, limit: String(limit) })

		if (lang !== undefined && scope.localize !== false) params.set('lang', lang)

		if (scope.near !== undefined) {
			params.set('lat', String(scope.near.latitude))

			params.set('lon', String(scope.near.longitude))
		}

		if (scope.box !== undefined) params.set('bbox', scope.box.join(','))

		// Repeated rather than joined: Photon reads each as its own term, and a
		// comma-joined value matches nothing.
		for (const layer of layers ?? []) params.append('layer', layer)

		for (const tag of osmTag ?? []) params.append('osm_tag', tag)

		return request(params, signal)
	}

	/**
	 * The matches for `rest` inside a US state, or an empty list where the state
	 * has no such match.
	 *
	 * Photon filters by a box, and a box around a state holds parts of the
	 * states next to it. A match in another state is therefore removed. The
	 * filter compares the English name or the USPS code of the state, so this
	 * search asks for no language: `lang` would give the name of the state in
	 * that language.
	 */
	async function searchInState(
		rest: string,
		state: UsState,
		signal: AbortSignal,
	): Promise<PhotonFeature[]> {
		const params = new URLSearchParams({
			q: state.name,
			limit: '1',
			layer: 'state',
			countrycode: 'US',
		})

		const [area] = await request(params, signal)

		const box = boxOf(area?.properties.extent)

		if (box === undefined) return []

		const features = await search(rest, { box, localize: false }, signal)

		return features.filter(
			(feature) =>
				feature.properties.state === state.name || feature.properties.state === state.code,
		)
	}

	/**
	 * The matches near a postal code at the end of the query. `null` means that
	 * the query does not end in a code that the geocoder knows.
	 */
	async function searchNearPostcode(
		query: string,
		region: string | undefined,
		signal: AbortSignal,
	): Promise<PhotonFeature[] | null> {
		// The longer candidate first, so that "SW1A 1AA" is not read as "1AA".
		for (const { rest, qualifier } of splitPostcode(query)) {
			const code = await findPostcode(qualifier, region, signal)

			if (code === undefined) continue

			const [longitude, latitude] = code.geometry.coordinates

			// A query that is only a code asks for the code, and the code in the
			// region is the one the reader means.
			if (rest === '' && layers === undefined && osmTag === undefined) return [code]

			// The code stays in the query, as the geocoder holds it. Photon does not
			// need each word to match, and an address with an abbreviated street
			// matches on its code. The code is not a layer or a tag that a filter
			// keeps, so a filtered provider that was given only a code searches the
			// code, and the filters apply.
			return search(
				[rest, qualifier].filter(Boolean).join(' '),
				{ near: { latitude, longitude } },
				signal,
			)
		}

		return null
	}

	return async (query, { signal }) => {
		const region = (options.region ?? browserRegion())?.toUpperCase()

		const nearPostcode = await searchNearPostcode(query, region, signal)

		if (nearPostcode !== null) return nearPostcode.map(featureToSuggestion)

		const inState = region === 'US' ? splitUsState(query) : null

		if (inState === null) {
			const features = await search(query, { near: bias }, signal)

			return features.map(featureToSuggestion)
		}

		// A state is too large to search near its center, so the search stays
		// inside it. The query as typed runs beside it, because a state name can
		// be part of a name: "Mount Washington" is in New Hampshire.
		const [typed, scoped] = await Promise.all([
			search(query, { near: bias }, signal),
			searchInState(inState.rest, inState.state, signal),
		])

		const named = typed.some((feature) => namesState(feature, inState.state))

		return (named || scoped.length === 0 ? typed : scoped).map(featureToSuggestion)
	}
}

/**
 * Default {@link AddressProvider} backed by the public Photon (Komoot)
 * geocoder, at {@link createPhotonProvider}'s own defaults: five matches, the
 * instance's language, no proximity bias, and every layer.
 *
 * @remarks Throws on a non-OK status or an unexpected response shape.
 * @see {@link createPhotonProvider} to bias the ranking or narrow the layers.
 */
export const photonProvider: AddressProvider = createPhotonProvider()

/**
 * The identity of a match.
 *
 * The OSM object, and what this document says it is. The object alone does not
 * identify a match, because Photon indexes one object as several documents. A
 * search for "Clearwater" returns relation 192205 twice: once as a village and
 * once as a locality. Two results under one id merge wherever a consumer stores
 * them by that id. `type` is what parts them.
 *
 * A postal code has no object, so its country and its code identify it.
 */
function featureId(p: PhotonFeature['properties']): string {
	if (p.osm_type === undefined || p.osm_id === undefined) {
		return `${p.osm_key ?? 'place'}:${p.osm_value ?? p.type ?? 'other'}:${p.countrycode ?? ''}:${p.name ?? ''}`
	}

	return p.type === undefined ? `${p.osm_type}${p.osm_id}` : `${p.osm_type}${p.osm_id}:${p.type}`
}

function featureToSuggestion(feature: PhotonFeature): AddressSuggestion {
	const p = feature.properties

	const [longitude, latitude] = feature.geometry.coordinates

	const street = [p.housenumber, p.street].filter(Boolean).join(' ')

	// A city, a state, or a country is its own part of the address, but Photon
	// leaves that part out of the feature that is the area itself: the city of
	// Lisbon carries a state and a country, and no city. The name fills it.
	const own = (kind: string) => (p.type === kind ? p.name : undefined)

	const address: AddressParts = {
		street: street || undefined,
		city: p.city ?? own('city'),
		state: p.state ?? own('state'),
		postcode: p.postcode,
		country: p.country ?? own('country'),
	}

	const locality = [p.city, p.state, p.postcode, p.country].filter(Boolean).join(', ')

	// The label is the first line the match has, and the description is the rest.
	// A business leads with its name and is located by the street line beneath;
	// an unnamed match has only where it is, so the street line leads and the
	// region locates it. One rule covers both, and a fourth line would be a
	// fourth entry rather than a third branch.
	const [primary = '', ...rest] = [p.name, street, locality].filter(Boolean)

	return {
		id: featureId(p),
		label: primary,
		description: rest.join(', ') || undefined,
		name: p.name,
		address,
		latitude,
		longitude,
		raw: feature,
	}
}
