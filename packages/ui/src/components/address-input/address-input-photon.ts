import type { AddressProvider, AddressSuggestion } from './types'

type PhotonFeature = {
	type: 'Feature'
	geometry: { type: 'Point'; coordinates: [number, number] }
	properties: {
		osm_id: number
		osm_type: string
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

export const photonProvider: AddressProvider = async (query, { signal }) => {
	const url = `${PHOTON_ENDPOINT}?q=${encodeURIComponent(query)}&limit=5`

	const response = await fetch(url, { signal })

	if (!response.ok) throw new Error(`Photon request failed: ${response.status}`)

	const data: unknown = await response.json()

	if (!isPhotonResponse(data)) throw new Error('Photon response did not match expected shape')

	return data.features.map(featureToSuggestion)
}

function featureToSuggestion(feature: PhotonFeature): AddressSuggestion {
	const p = feature.properties

	const [longitude, latitude] = feature.geometry.coordinates

	const street = [p.housenumber, p.street].filter(Boolean).join(' ')

	const primary = street || p.name || ''

	const secondary = [p.city, p.state, p.postcode, p.country].filter(Boolean).join(', ')

	const label = primary || secondary

	const description = primary ? secondary || undefined : undefined

	return {
		id: `${p.osm_type}${p.osm_id}`,
		label,
		description,
		latitude,
		longitude,
		raw: feature,
	}
}
