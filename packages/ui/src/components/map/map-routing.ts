import type { LngLat } from './types'

const DEFAULT_OSRM_URL = 'https://router.project-osrm.org'

const DEFAULT_VALHALLA_URL = 'https://valhalla1.openstreetmap.de'

type Profile = 'driving' | 'walking' | 'cycling'

export type FetchOsrmRouteOptions = {
	/**
	 * OSRM-compatible base URL. Defaults to the OSRM public demo server,
	 * which is rate-limited and frequently returns 504s — point at a
	 * self-hosted OSRM instance for production.
	 */
	baseUrl?: string
	profile?: Profile
	signal?: AbortSignal
}

export type FetchValhallaRouteOptions = {
	/**
	 * Valhalla base URL. Defaults to the OSM community server, which has
	 * a best-effort fair-use policy — point at a self-hosted Valhalla for
	 * production.
	 */
	baseUrl?: string
	profile?: Profile
	signal?: AbortSignal
}

/**
 * Fetch a routed polyline through OSRM. Returns the geometry coordinates,
 * or null if there are fewer than 2 waypoints or the request fails —
 * callers should fall back to a straight-line path.
 */
export async function fetchOsrmRoute(
	waypoints: LngLat[],
	options: FetchOsrmRouteOptions = {},
): Promise<LngLat[] | null> {
	if (waypoints.length < 2) return null

	const { baseUrl = DEFAULT_OSRM_URL, profile = 'driving', signal } = options

	const coords = waypoints.map((p) => `${p[0]},${p[1]}`).join(';')

	const url = `${baseUrl}/route/v1/${profile}/${coords}?overview=full&geometries=geojson`

	try {
		const res = await fetch(url, { signal })

		if (!res.ok) return null

		const json = (await res.json()) as {
			routes?: Array<{ geometry?: { coordinates?: LngLat[] } }>
		}

		return json.routes?.[0]?.geometry?.coordinates ?? null
	} catch {
		return null
	}
}

/**
 * Fetch a routed polyline through Valhalla (OSRM-compatible response mode).
 * Same semantics as `fetchOsrmRoute`: returns null on <2 waypoints or any
 * error so callers can fall back to straight-line segments.
 */
export async function fetchValhallaRoute(
	waypoints: LngLat[],
	options: FetchValhallaRouteOptions = {},
): Promise<LngLat[] | null> {
	if (waypoints.length < 2) return null

	const { baseUrl = DEFAULT_VALHALLA_URL, profile = 'driving', signal } = options

	const costing = profile === 'driving' ? 'auto' : profile === 'walking' ? 'pedestrian' : 'bicycle'

	const body = JSON.stringify({
		locations: waypoints.map(([lon, lat]) => ({ lat, lon })),
		costing,
		shape_format: 'geojson',
	})

	try {
		const res = await fetch(`${baseUrl}/route?format=osrm`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body,
			signal,
		})

		if (!res.ok) return null

		const json = (await res.json()) as {
			routes?: Array<{ geometry?: { coordinates?: LngLat[] } }>
		}

		return json.routes?.[0]?.geometry?.coordinates ?? null
	} catch {
		return null
	}
}
