/**
 * What a routing answer reduces to, and the OSRM-shaped payload both services
 * answer with. One reader serves both clients, so a Valhalla leg and an OSRM
 * leg reach an overlay in the same shape.
 */

import type { LngLat } from '../types'
import { type MapRouteFailure, noRouteFailure, routeFailure } from './failure'
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

/**
 * What a routing client answers with: the leg, or why there is none. The two
 * are mutually exclusive in the type, so a caller that reads `ok` reaches the
 * route or the failure without a second test.
 *
 * @see {@link MapRouteFailure} for the reasons, and the retry each one allows.
 */
export type MapRouteAnswer =
	| { ok: true; route: MapRouteResult }
	| { ok: false; failure: MapRouteFailure }

/** The OSRM-shaped route payload both services answer with. @internal */
export type OsrmPayload = {
	routes?: Array<{
		/** GeoJSON geometry (OSRM `geometries=geojson`) or an encoded polyline6 string (Valhalla `shape_format`). */
		geometry?: { coordinates?: LngLat[] } | string
		distance?: number
		duration?: number
	}>
	/** The service's own status: `'Ok'` on a routed answer, its own refusal otherwise. */
	code?: string
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

/**
 * Why a payload that carries no leg carries none. A service that cannot join a
 * pair refuses in its own code under a 200 — OSRM answers `'NoRoute'` with no
 * `routes` at all — so a code that is not `'Ok'` is the service's own answer and
 * reads as a refusal, carrying that code. An empty `routes` array says the same
 * thing without naming it. A body with neither is not a routing answer, whatever
 * else it parsed as.
 *
 * @internal
 */
function emptyPayloadFailure(json: OsrmPayload): MapRouteFailure {
	if (json.code !== undefined && json.code !== 'Ok') return noRouteFailure(json.code)

	return json.routes === undefined ? routeFailure('payload') : noRouteFailure()
}

/** The first route's geometry and totals, or why the payload holds none. @internal */
export function routeAnswer(json: OsrmPayload): MapRouteAnswer {
	const route = json.routes?.[0]

	if (route === undefined) return { ok: false, failure: emptyPayloadFailure(json) }

	const path = geometryPath(route.geometry) ?? []

	// `overview: 'false'` answers with the totals and no geometry — the cheap
	// distance/duration-only request the option documents — so keep them and hand
	// back an empty path the overlay draws a straight line for. A leg with neither
	// geometry nor a total is nothing the service could have routed, so it reads as
	// a payload this reader cannot take rather than as a refusal it never made.
	if (path.length === 0 && route.distance === undefined && route.duration === undefined) {
		return { ok: false, failure: routeFailure('payload') }
	}

	return {
		ok: true,
		route: {
			path,
			distanceMeters: route.distance ?? 0,
			durationSeconds: route.duration ?? 0,
		},
	}
}
