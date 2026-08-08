/**
 * The OSRM client: a GET whose waypoints ride the path and whose geometry comes
 * back as GeoJSON.
 */

import type { LngLat } from '../types'
import { type Profile, requestSignal } from './request'
import { type MapRouteResult, type OsrmPayload, routeResult } from './result'

const DEFAULT_OSRM_URL = 'https://router.project-osrm.org'

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

/**
 * Fetch a routed leg through OSRM: the street-following polyline plus its
 * distance and duration. Returns `null` if there are fewer than 2 waypoints
 * or the request fails. A caller then falls back to straight-line segments;
 * an overlay with no `path` already draws them.
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
