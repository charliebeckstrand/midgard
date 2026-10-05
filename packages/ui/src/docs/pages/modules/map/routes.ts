import { useEffect, useState } from 'react'
import { fetchOsrmRoute, type LngLat, type MapRouteAnswer, type MapRouteResult } from 'ui/map'

/** The hub of a distribution network in Kansas City. The network is not real. */
export const ikeaHub: LngLat = [-94.58, 39.1]

/** The destinations of the network from {@link ikeaHub}. */
export const ikeaDestinations: { abbreviation: string; at: LngLat }[] = [
	{ abbreviation: 'LA', at: [-118.24, 34.05] },
	{ abbreviation: 'SEA', at: [-122.33, 47.61] },
	{ abbreviation: 'NYC', at: [-74.0, 40.71] },
	{ abbreviation: 'ATL', at: [-84.39, 33.75] },
]

/** Two long-haul corridors, each between two cities. */
export const corridors: { abbreviation: string; start: LngLat; end: LngLat }[] = [
	{ abbreviation: 'SF→NY', start: [-122.42, 37.77], end: [-74.0, 40.71] },
	{ abbreviation: 'LA→JAX', start: [-118.24, 34.05], end: [-81.66, 30.33] },
]

/** The two ends of a line haul: Los Angeles and Chicago. */
export const lineHaul: { start: LngLat; end: LngLat } = {
	start: [-118.24, 34.05],
	end: [-87.63, 41.88],
}

// The answer for each pair of places, so a second mount of a map, such as on
// a return to its tab, sends no request. A failed answer leaves the cache, so
// the next mount asks again.
const answers = new Map<string, Promise<MapRouteAnswer>>()

function answerFor(start: LngLat, end: LngLat): Promise<MapRouteAnswer> {
	const key = `${start};${end}`

	let answer = answers.get(key)

	if (answer === undefined) {
		answer = fetchOsrmRoute([start, end]).then((result) => {
			if (!result.ok) answers.delete(key)

			return result
		})

		answers.set(key, answer)
	}

	return answer
}

/**
 * The road between two places, from the OSRM demo server, or `null` while it
 * loads or when the server gives no road. An example mounts its line only
 * when the road is in, so no straight line shows first, and the line then
 * draws itself in under `animate`.
 *
 * @remarks
 * The demo server is free, and it limits the rate of requests. An app sends
 * `fetchOsrmRoute` to an OSRM server of its own with the `baseUrl` option.
 */
export function useRoute(start: LngLat, end: LngLat): MapRouteResult | null {
	const [route, setRoute] = useState<MapRouteResult | null>(null)

	useEffect(() => {
		let live = true

		answerFor(start, end).then((answer) => {
			if (live && answer.ok) setRoute(answer.route)
		})

		return () => {
			live = false
		}
	}, [start, end])

	return route
}
