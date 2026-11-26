/**
 * Double of `modules/map/engine/map-routing/osrm`, applied globally via
 * `setup/module-mocks.ts`.
 *
 * The real `fetchOsrmRoute` asks the OSRM demo server for each route. The
 * examples of the map page in the docs call it, and the fetch guard
 * (`helpers/fetch-guard.ts`) refuses that request. The double answers at once
 * with a fixed route: a straight line through the waypoints, with fixed totals.
 * Thus each run draws the same routes, with no request.
 *
 * The real client runs in `map-routing.test.ts`, a node file of the `pure`
 * project, which loads no module doubles. That file stubs `fetch`.
 */

import type * as osrm from '../../modules/map/engine/map-routing/osrm'

/** The distance of the fixed route, in meters. */
const DISTANCE_METERS = 1_000_000

/** The travel time of the fixed route, in seconds. */
const DURATION_SECONDS = 36_000

const mockedOsrm: typeof osrm = {
	fetchOsrmRoute: async (waypoints) => ({
		ok: true,
		route: {
			path: [...waypoints],
			distanceMeters: DISTANCE_METERS,
			durationSeconds: DURATION_SECONDS,
		},
	}),
}

export default mockedOsrm
