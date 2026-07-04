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
	/**
	 * Abort the request after this many milliseconds, combined with `signal`. A
	 * timed-out request resolves to `null` like any other failure, so the overlay
	 * falls back to a straight line. Omitted, only `signal` bounds it.
	 */
	timeoutMs?: number
	signal?: AbortSignal
}

/** Options for {@link fetchValhallaRoute}: the Valhalla server, travel profile, timeout, and an abort signal. */
export type FetchValhallaRouteOptions = {
	/**
	 * Valhalla base URL. Defaults to the OSM community server, which has
	 * a best-effort fair-use policy; point at a self-hosted Valhalla for
	 * production.
	 */
	baseUrl?: string
	profile?: Profile
	/**
	 * Abort the request after this many milliseconds, combined with `signal`. A
	 * timed-out request resolves to `null` like any other failure, so the overlay
	 * falls back to a straight line. Omitted, only `signal` bounds it.
	 */
	timeoutMs?: number
	signal?: AbortSignal
}

/**
 * The signal to hand `fetch`: the caller's, a fresh timeout, or both combined
 * through {@link AbortSignal.any}. `AbortSignal.timeout(undefined)` throws, so a
 * timeout signal is built only when `timeoutMs` is given; a fired timeout
 * rejects the fetch, which the callers turn into a `null` result.
 *
 * @internal
 */
function requestSignal(
	signal: AbortSignal | undefined,
	timeoutMs: number | undefined,
): AbortSignal | undefined {
	if (timeoutMs === undefined) return signal

	const timeout = AbortSignal.timeout(timeoutMs)

	return signal === undefined ? timeout : AbortSignal.any([signal, timeout])
}

/** The OSRM-shaped route payload both services answer with. @internal */
type OsrmPayload = {
	routes?: Array<{
		/** GeoJSON geometry (OSRM `geometries=geojson`) or an encoded polyline6 string (Valhalla `shape_format`). */
		geometry?: { coordinates?: LngLat[] } | string
		distance?: number
		duration?: number
	}>
}

/**
 * Decodes one zig-zag varint from `encoded` at `start`: the value and the index
 * just past it. The polyline codec packs each coordinate delta this way — 5-bit
 * chunks, low chunk first, high bit set while more follow, the final value
 * zig-zag-encoded so small negatives stay short.
 *
 * @internal
 */
function decodeVarint(encoded: string, start: number): { value: number; next: number } {
	let index = start

	let result = 0

	let shift = 0

	let byte: number

	do {
		byte = encoded.charCodeAt(index++) - 63

		result |= (byte & 0x1f) << shift

		shift += 5
	} while (byte >= 0x20)

	return { value: result & 1 ? ~(result >> 1) : result >> 1, next: index }
}

/**
 * Decodes an encoded polyline to `LngLat` pairs. Valhalla's OSRM-mode
 * `shape_format: 'polyline6'` answers with precision-6 strings, so the delta
 * `factor` is `1e6`. The codec stores each pair lat-then-lng, so every point is
 * emitted swapped to the module's `[lon, lat]` order.
 *
 * @internal
 */
function decodePolyline(encoded: string, factor = 1e6): LngLat[] {
	const points: LngLat[] = []

	let index = 0

	let lat = 0

	let lng = 0

	while (index < encoded.length) {
		const dLat = decodeVarint(encoded, index)

		lat += dLat.value

		const dLng = decodeVarint(encoded, dLat.next)

		lng += dLng.value

		index = dLng.next

		points.push([lng / factor, lat / factor])
	}

	return points
}

/**
 * A route geometry's coordinates as `LngLat`, from either encoding the services
 * answer with: a GeoJSON `{ coordinates }` object (OSRM `geometries=geojson`)
 * passes through, an encoded polyline6 string (Valhalla) decodes. `undefined`
 * when neither is present.
 *
 * @internal
 */
function geometryPath(
	geometry: { coordinates?: LngLat[] } | string | undefined,
): LngLat[] | undefined {
	return typeof geometry === 'string' ? decodePolyline(geometry) : geometry?.coordinates
}

/** The first route's geometry and totals, or `null` when the payload has none. @internal */
function routeResult(json: OsrmPayload): MapRouteResult | null {
	const route = json.routes?.[0]

	const path = geometryPath(route?.geometry)

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
		timeoutMs,
		signal,
	} = options

	const coords = waypoints.map((p) => `${p[0]},${p[1]}`).join(';')

	const url = `${baseUrl}/route/v1/${profile}/${coords}?overview=${overview}&geometries=geojson`

	try {
		const res = await fetch(url, { signal: requestSignal(signal, timeoutMs) })

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

	const { baseUrl = DEFAULT_VALHALLA_URL, profile = 'driving', timeoutMs, signal } = options

	const costing = profile === 'driving' ? 'auto' : profile === 'walking' ? 'pedestrian' : 'bicycle'

	// `directions_type: 'none'` skips Valhalla's maneuver and narrative build and
	// the per-step `steps` array it would emit — the map reads only the geometry,
	// distance, and duration, all of which this leaves untouched. `polyline6` is
	// the compact delta-encoded shape (decoded by `geometryPath`), a smaller
	// payload and parse than the equivalent GeoJSON coordinate array.
	const body = JSON.stringify({
		locations: waypoints.map(([lon, lat]) => ({ lat, lon })),
		costing,
		shape_format: 'polyline6',
		directions_type: 'none',
	})

	try {
		const res = await fetch(`${baseUrl}/route?format=osrm`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body,
			signal: requestSignal(signal, timeoutMs),
		})

		if (!res.ok) return null

		return routeResult((await res.json()) as OsrmPayload)
	} catch {
		return null
	}
}
