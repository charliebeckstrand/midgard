/**
 * The OSRM client: a GET whose waypoints ride the path and whose geometry comes
 * back as GeoJSON.
 */

import type { LngLat } from '../types'
import { routeFailure } from './failure'
import { type Profile, requestSignal, routeFetch } from './request'
import type { MapRouteAnswer } from './result'

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
	 * timed-out request fails as `'timeout'`, apart from the `'aborted'` a
	 * caller's own signal ends it with. Omitted, only `signal` bounds it.
	 */
	timeoutMs?: number
	signal?: AbortSignal
}

/**
 * Fetch a routed leg through OSRM: the street-following polyline plus its
 * distance and duration.
 *
 * @param waypoints - The stops in travel order; under two of them name no leg.
 * @param options - The server, profile, geometry detail, and abort bounds.
 * @returns `{ ok: true, route }` with the leg, or `{ ok: false, failure }`
 * naming what stopped it and whether asking again could answer differently.
 *
 * @remarks A caller that draws whatever it gets falls back to straight-line
 * segments on any failure; an overlay with no `path` already draws them. Read
 * the failure where the two ends differ: a `'timeout'` or a 504 from the demo
 * server is worth another request, while `'no-route'` is the service's own
 * answer that no road joins the stops.
 *
 * @see {@link MapRouteFailureKind} for the reasons a request fails.
 */
export async function fetchOsrmRoute(
	waypoints: LngLat[],
	options: FetchOsrmRouteOptions = {},
): Promise<MapRouteAnswer> {
	if (waypoints.length < 2) return { ok: false, failure: routeFailure('waypoints') }

	const {
		baseUrl = DEFAULT_OSRM_URL,
		profile = 'driving',
		overview = 'simplified',
		timeoutMs,
		signal,
	} = options

	const coords = waypoints.map((p) => `${p[0]},${p[1]}`).join(';')

	const url = `${baseUrl}/route/v1/${profile}/${coords}?overview=${overview}&geometries=geojson`

	return routeFetch(url, { signal: requestSignal(signal, timeoutMs) })
}
