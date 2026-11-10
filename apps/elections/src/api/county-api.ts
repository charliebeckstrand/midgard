import type { MapFeatureCollection } from 'ui/map'

/**
 * The call of the browser to the county shapes of a state. The route handler
 * of the app (`app/api/county-shapes/[state]`) cuts them from the county atlas.
 */

/** The counties of a state, by the lowercase postal code of the state. */
export async function fetchCountyShapes(
	state: string,
	signal?: AbortSignal,
): Promise<MapFeatureCollection> {
	const response = await fetch(`/api/county-shapes/${state}`, { signal })

	if (!response.ok) throw new Error('The county map did not load. Try again.')

	return response.json()
}
