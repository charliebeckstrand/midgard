/**
 * What a routing answer reduces to, and the OSRM payload it reads from.
 */

import type { LngLat } from '../types'
import { httpFailure, type MapRouteFailure, noRouteFailure, routeFailure } from './failure'

/**
 * A routed leg: the street-following geometry to draw (a {@link MapRoute}
 * or {@link MapMarker} `path`) with the totals behind a mileage or ETA
 * readout.
 */
export type MapRouteResult = {
	/**
	 * The route geometry, ready to pass as an overlay's `path`. It is empty when
	 * the route carries totals but no geometry (an `overview: 'false'` request).
	 * The overlay then draws a straight line from its stops instead.
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

/** The OSRM route payload. @internal */
export type OsrmPayload = {
	routes?: Array<{
		/** GeoJSON geometry (OSRM `geometries=geojson`). */
		geometry?: { coordinates?: LngLat[] }
		distance?: number
		duration?: number
	}>
	/** The service's own status: `'Ok'` on a routed answer, its own refusal otherwise. */
	code?: string
}

/**
 * The codes OSRM refuses a pair it cannot join with: `'NoRoute'` where no road
 * joins the waypoints, and `'NoSegment'` where a waypoint lies off the network.
 * Its other codes under a 400 (`'InvalidValue'`, `'TooBig'`, and the rest) name
 * a request it will not read, which the status already says.
 *
 * @internal
 */
const REFUSAL_CODES: ReadonlySet<string> = new Set(['NoRoute', 'NoSegment'])

/**
 * The failure a refused response carries. OSRM answers a pair it cannot join
 * under a 400, with its own code in the body. A body naming one of
 * {@link REFUSAL_CODES} therefore reads as that refusal. Any other body, or no
 * body, leaves the status as the evidence.
 *
 * @param status - The status the service refused with.
 * @param body - The parsed body, or `undefined` where it did not parse.
 *
 * @internal
 */
export function refusedFailure(status: number, body: unknown): MapRouteFailure {
	const code = typeof body === 'object' && body !== null && 'code' in body ? body.code : undefined

	return typeof code === 'string' && REFUSAL_CODES.has(code)
		? noRouteFailure(code)
		: httpFailure(status)
}

/**
 * Why a payload that carries no leg carries none. OSRM refuses a pair it cannot
 * join under a 400 (see {@link refusedFailure}), so this reads a body under a
 * 200. A code there that is not `'Ok'` is still the service's own answer, and
 * reads as a refusal carrying that code. An empty `routes` array says the same
 * thing without naming it. A body with neither is not a routing answer,
 * whatever else it parsed as.
 *
 * @internal
 */
function emptyPayloadFailure(payload: OsrmPayload): MapRouteFailure {
	if (payload.code !== undefined && payload.code !== 'Ok') return noRouteFailure(payload.code)

	return payload.routes === undefined ? routeFailure('payload') : noRouteFailure()
}

/** The first route's geometry and totals, or why the payload holds none. @internal */
export function routeAnswer(payload: OsrmPayload): MapRouteAnswer {
	const route = payload.routes?.[0]

	if (route === undefined) return { ok: false, failure: emptyPayloadFailure(payload) }

	const path = route.geometry?.coordinates ?? []

	// `overview: 'false'` answers with the totals and no geometry (the cheap
	// distance/duration-only request the option documents), so keep them and hand
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
