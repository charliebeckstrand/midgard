import { listPlaces } from './places-store'

/**
 * What a reader with no visits file has already told the app: a state they
 * recorded a place in is a state they went to.
 *
 * Domain policy, so it sits above both stores rather than inside either. It
 * reads the geocoder's state name, which is the only one a stored place carries
 * — the atlas name the map draws by is a fact about geometry the server has no
 * copy of, so a coastal place the two disagree on seeds under the name it was
 * saved with and the reader can correct it in one press.
 */
export async function visitedSeed(): Promise<string[]> {
	const places = await listPlaces()

	return places.map((place) => place.state).filter((state) => state !== undefined)
}
