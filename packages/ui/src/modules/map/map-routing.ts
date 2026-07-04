import type { LngLat } from './types'

const DEFAULT_OSRM_URL = 'https://router.project-osrm.org'

const DEFAULT_VALHALLA_URL = 'https://valhalla1.openstreetmap.de'

type Profile = 'driving' | 'walking' | 'cycling'

/**
 * A routed leg: the street-following geometry to draw — a {@link MapRoute}
 * or {@link MapMarker} `path` — with the totals behind a mileage or ETA
 * readout.
 */
export type MapRouteResult = {
	/** The route geometry, ready to pass as an overlay's `path`. */
	path: LngLat[]
	/** Total travel distance in meters. */
	distanceMeters: number
	/** Total travel time in seconds. */
	durationSeconds: number
}

/** Geometry detail an OSRM route answers with; the `overview` query value. @internal */
type RouteOverview = 'full' | 'simplified' | 'false'

/** Options for {@link fetchOsrmRoute}: the OSRM server, travel profile, geometry detail, and an abort signal. */
export type FetchOsrmRouteOptions = {
	/**
	 * OSRM-compatible base URL. Defaults to the OSRM public demo server,
	 * which is rate-limited, non-commercial, and prone to 504s; point at a
	 * self-hosted OSRM instance for production.
	 */
	baseUrl?: string
	profile?: Profile
	/**
	 * Geometry detail: `'simplified'` returns a Douglas-Peucker line at display
	 * resolution — a fraction of the coordinates, visually identical at map
	 * scale — `'full'` keeps every vertex, and `'false'` returns no geometry at
	 * all (distance and duration only, so the overlay falls back to a straight
	 * line). The distance and duration totals are the same under all three.
	 * @defaultValue 'simplified'
	 * @remarks Defaults to `'simplified'`: the drawn path is sub-pixel-identical
	 * on the plat's frame while the payload — and the `JSON.parse`, the overlay's
	 * projection loop, and the SVG path — shrink by an order of magnitude on a
	 * long route. Pass `'full'` only where the geometry is reused at a deeper
	 * zoom than the map draws at.
	 */
	overview?: RouteOverview
	signal?: AbortSignal
}

/** Options for {@link fetchValhallaRoute}: the Valhalla server, travel profile, and an abort signal. */
export type FetchValhallaRouteOptions = {
	/**
	 * Valhalla base URL. Defaults to the OSM community server, which has
	 * a best-effort fair-use policy; point at a self-hosted Valhalla for
	 * production.
	 */
	baseUrl?: string
	profile?: Profile
	signal?: AbortSignal
}

/** The OSRM-shaped route payload both services answer with. @internal */
type OsrmPayload = {
	routes?: Array<{
		geometry?: { coordinates?: LngLat[] }
		distance?: number
		duration?: number
	}>
}

/** The first route's geometry and totals, or `null` when the payload has none. @internal */
function routeResult(json: OsrmPayload): MapRouteResult | null {
	const route = json.routes?.[0]

	const path = route?.geometry?.coordinates

	if (!route || !path) return null

	return {
		path,
		distanceMeters: route.distance ?? 0,
		durationSeconds: route.duration ?? 0,
	}
}

/**
 * Fetch a routed leg through OSRM: the street-following polyline plus its
 * distance and duration. Returns `null` if there are fewer than 2 waypoints
 * or the request fails; callers should fall back to straight-line segments
 * (an overlay with no `path` already draws them).
 */
export async function fetchOsrmRoute(
	waypoints: LngLat[],
	options: FetchOsrmRouteOptions = {},
): Promise<MapRouteResult | null> {
	if (waypoints.length < 2) return null

	const {
		baseUrl = DEFAULT_OSRM_URL,
		profile = 'driving',
		overview = 'simplified',
		signal,
	} = options

	const coords = waypoints.map((p) => `${p[0]},${p[1]}`).join(';')

	const url = `${baseUrl}/route/v1/${profile}/${coords}?overview=${overview}&geometries=geojson`

	try {
		const res = await fetch(url, { signal })

		if (!res.ok) return null

		return routeResult((await res.json()) as OsrmPayload)
	} catch {
		return null
	}
}

/**
 * Fetch a routed leg through Valhalla (OSRM-compatible response mode). Same
 * semantics as {@link fetchOsrmRoute}: `null` on fewer than 2 waypoints or
 * any error; callers should fall back to straight-line segments.
 */
export async function fetchValhallaRoute(
	waypoints: LngLat[],
	options: FetchValhallaRouteOptions = {},
): Promise<MapRouteResult | null> {
	if (waypoints.length < 2) return null

	const { baseUrl = DEFAULT_VALHALLA_URL, profile = 'driving', signal } = options

	const costing = profile === 'driving' ? 'auto' : profile === 'walking' ? 'pedestrian' : 'bicycle'

	// `directions_type: 'none'` skips Valhalla's maneuver and narrative build and
	// the per-step `steps` array it would emit — the map reads only the geometry,
	// distance, and duration, all of which this leaves untouched.
	const body = JSON.stringify({
		locations: waypoints.map(([lon, lat]) => ({ lat, lon })),
		costing,
		shape_format: 'geojson',
		directions_type: 'none',
	})

	try {
		const res = await fetch(`${baseUrl}/route?format=osrm`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body,
			signal,
		})

		if (!res.ok) return null

		return routeResult((await res.json()) as OsrmPayload)
	} catch {
		return null
	}
}
