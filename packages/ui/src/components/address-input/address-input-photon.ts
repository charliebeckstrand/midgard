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

	const feature = value as { geometry?: unknown; properties?: unknown }

	if (typeof feature.geometry !== 'object' || feature.geometry === null) return false

	const coordinates = (feature.geometry as { coordinates?: unknown }).coordinates

	if (
		!Array.isArray(coordinates) ||
		coordinates.length !== 2 ||
		typeof coordinates[0] !== 'number' ||
		typeof coordinates[1] !== 'number'
	) {
		return false
	}

	if (typeof feature.properties !== 'object' || feature.properties === null) return false

	const properties = feature.properties as { osm_id?: unknown; osm_type?: unknown }

	return (
		(properties.osm_id === undefined || typeof properties.osm_id === 'number') &&
		(properties.osm_type === undefined || typeof properties.osm_type === 'string')
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
 * How many times `limit` the search inside a US state asks for. Photon has no
 * pages, and the matches outside the state are removed after the search, so a
 * request for only `limit` matches can lose all of them to a neighbor.
 */
const STATE_SEARCH_FACTOR = 4

/**
 * The request URL: the endpoint, its own query, then `params`. The split is by
 * hand and not by `new URL`, because `new URL` needs a base for a relative
 * endpoint such as a proxy path, and the URL must stay relative. A fragment
 * does not go to the server, so it is removed.
 */
function photonUrl(endpoint: string, params: URLSearchParams): string {
	const hashAt = endpoint.indexOf('#')

	const bare = hashAt === -1 ? endpoint : endpoint.slice(0, hashAt)

	const queryAt = bare.indexOf('?')

	if (queryAt === -1) return `${bare}?${params}`

	const query = new URLSearchParams(bare.slice(queryAt + 1))

	for (const [key, value] of params) query.append(key, value)

	return `${bare.slice(0, queryAt)}?${query}`
}

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
	 * rate limit or its terms do not suit. The endpoint can have its own query
	 * string, such as an API key. Each request keeps it and adds its own params.
	 * @defaultValue the public Komoot endpoint.
	 */
	endpoint?: string
	/**
	 * Matches to ask for. The search inside a US state asks for four times this
	 * number, removes the matches outside the state, then keeps this number.
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

/**
 * Whether a box spans 180 degrees of longitude or more. Photon gives such an
 * extent to an area that crosses the antimeridian, such as Alaska
 * (`-180` to `180`). A box like this holds most of the globe, so it does not
 * keep a search near the area.
 */
function spansGlobe([west, , east]: [number, number, number, number]): boolean {
	return east - west >= 180
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
		const response = await fetch(photonUrl(endpoint, params), { signal })

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
		// code that is the typed code is its position. A geocoder can ignore
		// `countrycode`, so a code in another country is not the code in the region.
		return features.find(
			(feature) =>
				feature.properties.osm_value === 'postcode' &&
				compact(feature.properties.name ?? '') === compact(postcode) &&
				(region === undefined ||
					feature.properties.countrycode?.toUpperCase() === region.toUpperCase()),
		)
	}

	/**
	 * Where a search looks: near a point, or only inside a box. `localize: false`
	 * asks for no language, whatever `lang` is. `count` is the number of matches
	 * to ask for; `limit` otherwise.
	 */
	type Scope = {
		near?: PhotonProviderOptions['bias']
		box?: [number, number, number, number]
		localize?: boolean
		count?: number
	}

	function search(query: string, scope: Scope, signal: AbortSignal) {
		const params = new URLSearchParams({ q: query, limit: String(scope.count ?? limit) })

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
	 * search asks for `STATE_SEARCH_FACTOR` times `limit` matches, so that the
	 * matches in the next state do not fill the page, and keeps `limit` after
	 * the filter. The filter compares the English name or the USPS code of the
	 * state, so this search asks for no language: `lang` would give the name of
	 * the state in that language.
	 *
	 * Where the box of the state spans the globe, as Alaska's does, the search
	 * sends no box. It searches near the point of the state, and the filter
	 * still removes the matches outside the state.
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

		if (area === undefined || box === undefined) return []

		const [longitude, latitude] = area.geometry.coordinates

		const count = limit * STATE_SEARCH_FACTOR

		const features = await search(
			rest,
			spansGlobe(box)
				? { near: { latitude, longitude }, localize: false, count }
				: { box, localize: false, count },
			signal,
		)

		return features
			.filter(
				(feature) =>
					feature.properties.state === state.name || feature.properties.state === state.code,
			)
			.slice(0, limit)
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
		// inside its box, where the box does not span the globe. The query as
		// typed runs beside it, because a state name can be part of a name:
		// "Mount Washington" is in New Hampshire.
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
function featureId(properties: PhotonFeature['properties']): string {
	if (properties.osm_type === undefined || properties.osm_id === undefined) {
		return `${properties.osm_key ?? 'place'}:${properties.osm_value ?? properties.type ?? 'other'}:${properties.countrycode ?? ''}:${properties.name ?? ''}`
	}

	return properties.type === undefined
		? `${properties.osm_type}${properties.osm_id}`
		: `${properties.osm_type}${properties.osm_id}:${properties.type}`
}

function featureToSuggestion(feature: PhotonFeature): AddressSuggestion {
	const properties = feature.properties

	const [longitude, latitude] = feature.geometry.coordinates

	const street = [properties.housenumber, properties.street].filter(Boolean).join(' ')

	// A city, a state, or a country is its own part of the address, but Photon
	// leaves that part out of the feature that is the area itself: the city of
	// Lisbon carries a state and a country, and no city. The name fills it.
	const own = (kind: string) => (properties.type === kind ? properties.name : undefined)

	const address: AddressParts = {
		street: street || undefined,
		city: properties.city ?? own('city'),
		state: properties.state ?? own('state'),
		postcode: properties.postcode,
		country: properties.country ?? own('country'),
	}

	const locality = [properties.city, properties.state, properties.postcode, properties.country]
		.filter(Boolean)
		.join(', ')

	// The label is the first line the match has, and the description is the rest.
	// A business leads with its name and is located by the street line beneath;
	// an unnamed match has only where it is, so the street line leads and the
	// region locates it. One rule covers both, and a fourth line would be a
	// fourth entry rather than a third branch.
	const [primary = '', ...rest] = [properties.name, street, locality].filter(Boolean)

	return {
		id: featureId(properties),
		label: primary,
		description: rest.join(', ') || undefined,
		name: properties.name,
		address,
		latitude,
		longitude,
		raw: feature,
	}
}
