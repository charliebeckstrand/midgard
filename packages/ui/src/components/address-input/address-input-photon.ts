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

const PHOTON_ENDPOINT = 'https://photon.komoot.io/api/'

export const photonProvider: AddressProvider = async (query, { signal }) => {
	const url = `${PHOTON_ENDPOINT}?q=${encodeURIComponent(query)}&limit=5`

	const response = await fetch(url, { signal })

	if (!response.ok) throw new Error(`Photon request failed: ${response.status}`)

	const data = (await response.json()) as PhotonResponse

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
