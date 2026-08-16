import type { Visits } from '../types'
import { listPlaces } from './places-store'

/**
 * What a reader with no visits file has already told the app: a region they
 * recorded a place in is a region they went to.
 *
 * Domain policy, so it sits above both stores rather than inside either. It
 * reads the geocoder's own state and country, which are the only names a stored
 * place carries — the atlas names the map draws by are facts about geometry the
 * server has no copy of.
 *
 * A seeded name the atlas does not draw simply does not paint, which is the same
 * rule the grouping applies to its own fallback. Natural Earth writes "United
 * States of America" where a geocoder commonly writes "United States", so that
 * one is the country most likely to want the single press that corrects it.
 */
export async function visitedSeed(): Promise<Visits> {
	const places = await listPlaces()

	return {
		states: places.map((place) => place.state).filter((state) => state !== undefined),
		countries: places.map((place) => place.country).filter((country) => country !== undefined),
	}
}
