import { useEffect, useState } from 'react'
import { fetchOsrmRoute, type LngLat, type MapRouteAnswer, type MapRouteResult } from 'ui/map'
import { getOrCompute } from '../../../../utilities/get-or-compute.ts'

// The answer for each pair of places, so a second mount of a map, such as on
// a return to its tab, sends no request. A failed answer leaves the cache, so
// the next mount asks again.
const answers = new Map<string, Promise<MapRouteAnswer>>()

function answerFor(start: LngLat, end: LngLat): Promise<MapRouteAnswer> {
	const key = `${start};${end}`

	return getOrCompute(answers, key, () =>
		fetchOsrmRoute([start, end]).then((result) => {
			if (!result.ok) answers.delete(key)

			return result
		}),
	)
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
