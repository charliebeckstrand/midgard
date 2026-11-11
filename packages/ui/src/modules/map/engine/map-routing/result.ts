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

/**
 * The OSRM route payload, as a parsed body holds it. JSON has no `undefined`: a
 * service with no value for a key omits the key or writes `null`. Each level
 * can thus be `null`, and the reader takes a `null` as an absent value.
 *
 * A parsed body is `unknown` until {@link isOsrmPayload} reads it as this type.
 *
 * @internal
 */
type OsrmPayload = {
	routes?: Array<{
		/** GeoJSON geometry (OSRM `geometries=geojson`). */
		geometry?: { coordinates?: LngLat[] | null } | null
		distance?: number | null
		duration?: number | null
	} | null> | null
	/** The service's own status: `'Ok'` on a routed answer, its own refusal otherwise. */
	code?: string | null
} | null

/** A level of a parsed body that holds keys: what JSON gives for `{}`. @internal */
type Fields = Record<string, unknown>

function isFields(value: unknown): value is Fields {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Whether a key holds no value, or a value that passes `test`. @internal */
function absentOr(value: unknown, test: (value: unknown) => boolean): boolean {
	return value == null || test(value)
}

/**
 * Whether a value is a number that a total or a position can hold. `JSON.parse`
 * reads `1e999` as `Infinity`, which is neither.
 *
 * @internal
 */
function isNumber(value: unknown): boolean {
	return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Whether a value is a GeoJSON position: a longitude, then a latitude. GeoJSON
 * permits more members after the two, and the reader lets them stay.
 *
 * @internal
 */
function isPosition(value: unknown): boolean {
	return Array.isArray(value) && isNumber(value[0]) && isNumber(value[1])
}

function isGeometry(value: unknown): boolean {
	return (
		isFields(value) &&
		absentOr(value.coordinates, (line) => Array.isArray(line) && line.every(isPosition))
	)
}

function isLeg(value: unknown): boolean {
	return (
		isFields(value) &&
		absentOr(value.geometry, isGeometry) &&
		absentOr(value.distance, isNumber) &&
		absentOr(value.duration, isNumber)
	)
}

/**
 * Whether a parsed body is an {@link OsrmPayload}: each value that the type
 * names is absent, or has the type that OSRM gives it. This is the one decode
 * of the body. The body of a 200 comes from a service that the caller names,
 * and nothing else says what it holds. The reader gives `coordinates` to the
 * overlay as its `path` and the totals to the readout, so a value of the wrong
 * type must stop here.
 *
 * A body holds more keys than the type names. The test does not read them.
 *
 * @internal
 */
function isOsrmPayload(body: unknown): body is OsrmPayload {
	return absentOr(
		body,
		(held) =>
			isFields(held) &&
			absentOr(held.code, (code) => typeof code === 'string') &&
			absentOr(
				held.routes,
				(routes) => Array.isArray(routes) && routes.every((leg) => absentOr(leg, isLeg)),
			),
	)
}

/**
 * The codes OSRM refuses a pair it cannot join with. `'NoRoute'` is where no
 * road joins the waypoints, and `'NoSegment'` is where a waypoint lies off the
 * network.
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
	const code = isFields(body) ? body.code : undefined

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
	const code = payload?.code

	if (code != null && code !== 'Ok') return noRouteFailure(code)

	return payload?.routes == null ? routeFailure('payload') : noRouteFailure()
}

/**
 * The first route's geometry and totals, or why the body holds none. A body
 * that is not an {@link OsrmPayload} is not a routing answer, whatever else it
 * parsed as.
 *
 * @param body - The parsed body of a 200.
 *
 * @internal
 */
export function routeAnswer(body: unknown): MapRouteAnswer {
	if (!isOsrmPayload(body)) return { ok: false, failure: routeFailure('payload') }

	const routes = body?.routes

	if (routes == null || routes.length === 0) {
		return { ok: false, failure: emptyPayloadFailure(body) }
	}

	const route = routes[0]

	const path = route?.geometry?.coordinates ?? []

	// `overview: 'false'` answers with the totals and no geometry (the cheap
	// distance/duration-only request the option documents), so keep them and hand
	// back an empty path the overlay draws a straight line for. A leg with neither
	// geometry nor a total is nothing the service could have routed, so it reads as
	// a payload this reader cannot take rather than as a refusal it never made.
	if (path.length === 0 && route?.distance == null && route?.duration == null) {
		return { ok: false, failure: routeFailure('payload') }
	}

	return {
		ok: true,
		route: {
			path,
			distanceMeters: route?.distance ?? 0,
			durationSeconds: route?.duration ?? 0,
		},
	}
}
