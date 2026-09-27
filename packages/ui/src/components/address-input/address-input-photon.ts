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
	 * @defaultValue the public Komoot endpoint
	 */
	endpoint?: string
	/**
	 * Matches to ask for.
	 * @defaultValue 5
	 */
	limit?: number
	/** Language for the returned names; the instance's default otherwise. */
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
	 * @defaultValue the region of the browser's language, such as `US` for `en-US`
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

/**
 * The trailing parts of a query that can be a postal code, each with the text
 * before it. The list is empty where the query does not end in one. The text is
 * empty where the query is only a code.
 *
 * A candidate is the last word or the last two words, because a code such as
 * `SW1A 1AA` or `M5V 3L9` is two words. It must hold two digits or more and
 * three characters or more. Each word must hold a digit. Thus "5th Ave" and
 * "Pier 39" stay text. A US ZIP+4
 * reads as its first five digits, which is the code the geocoder holds.
 */
function splitPostcode(query: string): { rest: string; postcode: string }[] {
	const words = query.trim().replace(/,/g, ' ').split(/\s+/)

	const candidates: { rest: string; postcode: string }[] = []

	for (const count of [2, 1]) {
		if (words.length < count) continue

		const tail = words.slice(-count).join(' ')

		if (!/^[A-Za-z0-9]{2,5}(?:[ -][A-Za-z0-9]{2,4})?$/.test(tail)) continue

		if ((tail.match(/\d/g) ?? []).length < 2 || tail.length < 3) continue

		// Every word of a code holds a digit, so "Pier 39" is not a code.
		if (!tail.split(/[ -]/).every((part) => /\d/.test(part))) continue

		const zipPlusFour = /^(\d{5})-\d{4}$/.exec(tail)

		candidates.push({
			rest: words.slice(0, -count).join(' '),
			postcode: zipPlusFour?.[1] ?? tail.toUpperCase(),
		})
	}

	return candidates
}

/** A code with its spaces removed, so that `sw1a1aa` and `SW1A 1AA` compare equal. */
function compact(code: string): string {
	return code.replace(/\s+/g, '').toUpperCase()
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
 * A query that ends in a postal code searches near that code. Photon matches
 * each word against the text of a match, and many matches do not hold a postal
 * code. Without this step, "ice cream 97140" answers with ice cream in other
 * states.
 * The provider finds the position of the code first, then searches the rest of
 * the query with that position as the proximity bias. A query that is only a
 * code answers with that code. A query that ends in a code that the geocoder
 * does not know is searched as typed. See
 * {@link PhotonProviderOptions.region} for the country a code is read in.
 *
 * @param options - Endpoint, result count, language, proximity bias, postal
 * code region, and the layer / tag filters; see {@link PhotonProviderOptions}.
 * @returns A provider to hand `AddressInput`.
 * @remarks Throws on a non-OK status or an unexpected response shape. A query
 * that ends in a postal code costs a second request.
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
		signal: AbortSignal,
	): Promise<PhotonFeature | undefined> {
		const region = options.region ?? browserRegion()

		const params = new URLSearchParams({ q: postcode, limit: '5', osm_tag: 'place:postcode' })

		if (region !== undefined) params.set('countrycode', region.toUpperCase())

		const features = await request(params, signal)

		// The geocoder matches loosely, so "97140" can answer with 97141. Only a
		// code that is the typed code is its position.
		return features.find(
			(feature) =>
				feature.properties.osm_value === 'postcode' &&
				compact(feature.properties.name ?? '') === compact(postcode),
		)
	}

	function search(query: string, near: PhotonProviderOptions['bias'], signal: AbortSignal) {
		const params = new URLSearchParams({ q: query, limit: String(limit) })

		if (lang !== undefined) params.set('lang', lang)

		if (near !== undefined) {
			params.set('lat', String(near.latitude))

			params.set('lon', String(near.longitude))
		}

		// Repeated rather than joined: Photon reads each as its own term, and a
		// comma-joined value matches nothing.
		for (const layer of layers ?? []) params.append('layer', layer)

		for (const tag of osmTag ?? []) params.append('osm_tag', tag)

		return request(params, signal)
	}

	return async (query, { signal }) => {
		// The longer candidate first, so that "SW1A 1AA" is not read as "1AA".
		for (const { rest, postcode } of splitPostcode(query)) {
			const code = await findPostcode(postcode, signal)

			if (code === undefined) continue

			// A query that is only a code asks for the code, and the code in the
			// region is the one the reader means.
			if (rest === '') return [featureToSuggestion(code)]

			const [longitude, latitude] = code.geometry.coordinates

			const features = await search(rest, { latitude, longitude }, signal)

			return features.map(featureToSuggestion)
		}

		const features = await search(query, bias, signal)

		return features.map(featureToSuggestion)
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

	const address: AddressParts = {
		street: street || undefined,
		city: p.city,
		state: p.state,
		postcode: p.postcode,
		country: p.country,
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
