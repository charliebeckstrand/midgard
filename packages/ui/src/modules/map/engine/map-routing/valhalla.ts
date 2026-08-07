/**
 * The Valhalla client, in the service's OSRM-compatible response mode: a POST
 * whose locations ride the body and whose geometry comes back as an encoded
 * polyline (`polyline.ts`).
 */

import type { LngLat } from '../types'
import { type Profile, requestSignal } from './request'
import { type MapRouteResult, type OsrmPayload, routeResult } from './result'

const DEFAULT_VALHALLA_URL = 'https://valhalla1.openstreetmap.de'

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
 * Fetch a routed leg through Valhalla (OSRM-compatible response mode). Same
 * semantics as {@link fetchOsrmRoute}: `null` on fewer than 2 waypoints or
 * any error. A caller then falls back to straight-line segments.
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
	// the compact delta-encoded shape (decoded by `result.ts`), a smaller payload
	// and parse than the equivalent GeoJSON coordinate array.
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
