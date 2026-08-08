/**
 * What a routing answer reduces to, and the OSRM-shaped payload both services
 * answer with. One reader serves both clients, so a Valhalla leg and an OSRM
 * leg reach an overlay in the same shape.
 */

import type { LngLat } from '../types'
import { decodePolyline } from './polyline'

/**
 * A routed leg: the street-following geometry to draw — a {@link MapRoute}
 * or {@link MapMarker} `path` — with the totals behind a mileage or ETA
 * readout.
 */
export type MapRouteResult = {
	/**
	 * The route geometry, ready to pass as an overlay's `path`; empty when the
	 * route carries totals but no geometry (an `overview: 'false'` request), where
	 * the overlay draws a straight line from its stops instead.
	 */
	path: LngLat[]
	/** Total travel distance in meters. */
	distanceMeters: number
	/** Total travel time in seconds. */
	durationSeconds: number
}

/** The OSRM-shaped route payload both services answer with. @internal */
export type OsrmPayload = {
	routes?: Array<{
		/** GeoJSON geometry (OSRM `geometries=geojson`) or an encoded polyline6 string (Valhalla `shape_format`). */
		geometry?: { coordinates?: LngLat[] } | string
		distance?: number
		duration?: number
	}>
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

/** The first route's geometry and totals, or `null` when the payload has no leg. @internal */
export function routeResult(json: OsrmPayload): MapRouteResult | null {
	const route = json.routes?.[0]

	if (!route) return null

	const path = geometryPath(route.geometry) ?? []

	// `overview: 'false'` answers with the totals and no geometry — the cheap
	// distance/duration-only request the option documents — so keep them and hand
	// back an empty path the overlay draws a straight line for. A route with
	// neither geometry nor a total is an empty leg, so it reads as a miss.
	if (path.length === 0 && route.distance === undefined && route.duration === undefined) {
		return null
	}

	return {
		path,
		distanceMeters: route.distance ?? 0,
		durationSeconds: route.duration ?? 0,
	}
}
