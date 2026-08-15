import type { AddressParts, AddressProvider, AddressSuggestion } from './types'

type PhotonFeature = {
	type: 'Feature'
	geometry: { type: 'Point'; coordinates: [number, number] }
	properties: {
		osm_id: number
		osm_type: string
		/** What the match stands for: `house`, `street`, `city`, `other`. */
		type?: string
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

	return typeof p.osm_id === 'number' && typeof p.osm_type === 'string'
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
 * there is no layer to filter a business search down to — a business search asks
 * for the name and reads the name back ({@link AddressSuggestion.name}). Use
 * this to narrow the other way: `['house']` for a field that must resolve to a
 * doorstep, `['city']` for one that picks a market.
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
	 * no bias answers with the largest match on the planet, so a field that knows
	 * roughly where its reader is should say so — the map's own centre, or a
	 * coarse location the reader already gave.
	 */
	bias?: { latitude: number; longitude: number }
	/** Keep only these layers; every layer otherwise. See {@link PhotonLayer}. */
	layers?: PhotonLayer[]
	/**
	 * Keep only matches carrying these OpenStreetMap tags, in Photon's own
	 * `key:value` form (`'amenity:restaurant'`), with a leading `!` to exclude.
	 * The narrow instrument behind {@link layers}: a field that only ever wants
	 * restaurants asks for the tag.
	 */
	osmTag?: string[]
}

/**
 * Build an {@link AddressProvider} over a Photon geocoder.
 *
 * A match that names a business or a place leads with that name and carries the
 * address as its description, so a reader searching "Clearwater Restaurant"
 * reads the restaurant back rather than the street it stands on. A plain address
 * leads with the street line, as it always did. Either way the parts come back
 * in {@link AddressSuggestion.address} and the position in `latitude` /
 * `longitude`.
 *
 * @param options - Endpoint, result count, language, proximity bias, and the
 * layer / tag filters; see {@link PhotonProviderOptions}.
 * @returns A provider to hand `AddressInput`.
 * @remarks Throws on a non-OK status or an unexpected response shape.
 * @example
 * ```tsx
 * const nearby = createPhotonProvider({ bias: { latitude: 44.6, longitude: -124.05 } })
 *
 * <AddressInput provider={nearby} placeholder="Search for a place" />
 * ```
 */
export function createPhotonProvider(options: PhotonProviderOptions = {}): AddressProvider {
	const { endpoint = PHOTON_ENDPOINT, limit = DEFAULT_LIMIT, lang, bias, layers, osmTag } = options

	return async (query, { signal }) => {
		const params = new URLSearchParams({ q: query, limit: String(limit) })

		if (lang !== undefined) params.set('lang', lang)

		if (bias !== undefined) {
			params.set('lat', String(bias.latitude))

			params.set('lon', String(bias.longitude))
		}

		// Repeated rather than joined: Photon reads each as its own term, and a
		// comma-joined value matches nothing.
		for (const layer of layers ?? []) params.append('layer', layer)

		for (const tag of osmTag ?? []) params.append('osm_tag', tag)

		const response = await fetch(`${endpoint}?${params}`, { signal })

		if (!response.ok) throw new Error(`Photon request failed: ${response.status}`)

		const data: unknown = await response.json()

		if (!isPhotonResponse(data)) throw new Error('Photon response did not match expected shape')

		return data.features.map(featureToSuggestion)
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
		// The OSM object, and what this document says it is. The object alone does
		// not identify a match: Photon indexes one object as several documents, so
		// a search for "Clearwater" returns relation 192205 twice — once as a
		// village and once as a locality — and two results under one id merge
		// wherever a consumer stores them by it. `type` is what parts them.
		id: p.type === undefined ? `${p.osm_type}${p.osm_id}` : `${p.osm_type}${p.osm_id}:${p.type}`,
		label: primary,
		description: rest.join(', ') || undefined,
		name: p.name,
		address,
		latitude,
		longitude,
		raw: feature,
	}
}
