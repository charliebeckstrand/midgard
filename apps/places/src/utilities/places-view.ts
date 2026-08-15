import type { Place } from '../types'

/**
 * How the United States names itself in `world-atlas`, which is the one country
 * that draws regions of its own.
 *
 * The atlas's name and not the geocoder's. Natural Earth writes "United States
 * of America" where a geocoder commonly writes "United States", and this
 * constant is only ever compared against a name the atlas gave — never against
 * a name a place carries. Nothing here reads {@link Place.country}.
 */
export const UNITED_STATES = 'United States of America'

/**
 * Where the map is pointed.
 *
 * Three levels, held as two fields rather than a level and a name, because the
 * pair is what the trail back needs: a reader inside Oregon goes up to the
 * United States, and the United States is still in `country` to go up to.
 *
 * The United States is the only country that opens further, because it is the
 * only one this app carries a second atlas for.
 */
export type PlaceView = {
	/** The country the map has drilled into, or `null` for the whole world. */
	country: string | null
	/** The state, once the country is the United States; `null` at every other level. */
	state: string | null
}

/** Which atlas a view draws: the states of the United States, or the countries of the world. */
export type PlaceAtlas = 'states' | 'countries'

/** The whole world, which is where a collection that reaches outside one country opens. */
export const WORLD: PlaceView = { country: null, state: null }

/** The United States, whole — the view this app opened on before it drew anywhere else. */
export const UNITED_STATES_VIEW: PlaceView = { country: UNITED_STATES, state: null }

/**
 * The atlas a view draws.
 *
 * Inside the United States the map draws states, at every other level countries
 * — including inside one country, which is the countries atlas cut to one shape.
 */
export function viewAtlas(view: PlaceView): PlaceAtlas {
	return view.country === UNITED_STATES ? 'states' : 'countries'
}

/**
 * The one region a view is cut to, in the atlas it draws, or `null` for the
 * whole atlas. It is what {@link regionFrame} cuts out and what the paint and
 * the pointer are withdrawn over.
 */
export function viewRegion(view: PlaceView): string | null {
	return viewAtlas(view) === 'states' ? view.state : view.country
}

/** The geocoder's state, for the states atlas. Held at module scope so the identity is stable. */
function byState(place: Place): string | undefined {
	return place.state
}

/** The same, for the countries atlas. */
function byCountry(place: Place): string | undefined {
	return place.country
}

/**
 * Which field answers where the drawn geometry cannot, per the atlas the view
 * draws. Handed to `groupPlacesByRegion`, whose fallback this is.
 *
 * The countries atlas has a better answer than the name — see
 * {@link countryFallback}, which the app hands it instead.
 */
export function viewFallback(view: PlaceView): (place: Place) => string | undefined {
	return viewAtlas(view) === 'states' ? byState : byCountry
}

/** The ids of every place a grouping placed, which is what the other atlas then knows. */
export function placedIds(grouped: ReadonlyMap<string, readonly Place[]>): Set<string> {
	const ids = new Set<string>()

	for (const list of grouped.values()) {
		for (const place of list) ids.add(place.id)
	}

	return ids
}

/**
 * The countries atlas's fallback, asked of the states atlas before the name.
 *
 * A place the states atlas can put in a state is in the United States, whatever
 * the geocoder called its country. That matters because the world is drawn at
 * 110m, where the outline generalizes away exactly the places a travel log is
 * full of: a harbour, a beach, a coastal town all sit a little outside the
 * country that plainly holds them. Under the name alone they fell through to
 * "United States", which Natural Earth does not draw, and read as belonging
 * nowhere.
 *
 * So the two atlases answer together. The app already groups against the states
 * for its own reasons, and {@link placedIds} is that grouping's answer.
 */
export function countryFallback(
	placedInStates: ReadonlySet<string>,
): (place: Place) => string | undefined {
	return (place) => (placedInStates.has(place.id) ? UNITED_STATES : place.country)
}

/**
 * The view a click on `region` opens, from wherever the map is now.
 *
 * A country picked on the world map opens that country. A state picked inside
 * the United States opens that state. The United States is the crossing: picked
 * on the world map it opens as a country, and the atlas under it becomes the
 * states.
 */
export function drillInto(view: PlaceView, region: string): PlaceView {
	return viewAtlas(view) === 'states'
		? { country: view.country, state: region }
		: { country: region, state: null }
}

/**
 * What the frame draws, for the readout that names it: the one region a drill
 * cut to, the United States whole, or `null` for the world.
 *
 * It is not {@link viewRegion}. Inside the United States the frame draws every
 * state and is cut to none of them, so the region is `null` while the frame
 * plainly names a country — and a map that called that view "the world" would
 * report the one thing the reader can see it is not.
 */
export function viewFrame(view: PlaceView): string | null {
	return viewRegion(view) ?? view.country
}

/**
 * The region a view stands at, and the scope it is marked under — or `null` at
 * the world, which is not a region and has nothing to designate.
 *
 * It is not {@link viewRegion} either, and the United States is again why. Its
 * own view draws states and is cut to none of them, so the country would be the
 * one region on the map a reader could never mark: they cross into it and it
 * stops being somewhere they are. Read off the fields rather than the drawn
 * atlas, the state answers when there is one and the country answers otherwise.
 */
export function viewMark(view: PlaceView): { scope: PlaceAtlas; region: string } | null {
	if (view.state !== null) return { scope: 'states', region: view.state }

	if (view.country !== null) return { scope: 'countries', region: view.country }

	return null
}

/** One step of the trail: what it is called, and the view it goes back to. */
export type PlaceCrumb = {
	label: string
	view: PlaceView
}

/**
 * The trail from the world down to where the map is pointed. The last crumb is
 * where the reader is; every one before it is a way back.
 *
 * The root is called "Places" rather than "World", because it is the page as
 * well as the level — the whole map is every place there is.
 */
export function viewCrumbs(view: PlaceView): PlaceCrumb[] {
	const crumbs: PlaceCrumb[] = [{ label: 'Places', view: WORLD }]

	if (view.country !== null) {
		crumbs.push({ label: view.country, view: { country: view.country, state: null } })
	}

	if (view.state !== null) crumbs.push({ label: view.state, view })

	return crumbs
}

/**
 * The view that certainly shows one place: the state the states atlas puts it
 * in, or the world, which shows every place there is.
 *
 * The world rather than the place's own country, because a country is only
 * reachable by the name its atlas gives it and a place carries the geocoder's —
 * "United States" against "United States of America". A view built from the
 * wrong string frames nothing; the world frames everything, and the reader is
 * one click from the country either way.
 */
export function viewForPlace(
	grouped: ReadonlyMap<string, readonly Place[]>,
	place: Place,
): PlaceView {
	for (const [name, list] of grouped) {
		if (list.some((held) => held.id === place.id)) return { country: UNITED_STATES, state: name }
	}

	return WORLD
}

/**
 * The view the app opens on: the smallest geography that holds every place.
 *
 * The question is asked of the geometry and never of a country name. A place
 * the states atlas can put in a state is a place in the United States, whatever
 * the geocoder called its country — so a collection the states atlas accounts
 * for whole opens where this app always opened, and one it cannot opens on the
 * world.
 *
 * `grouped` must be the grouping against the states atlas, which is what the app
 * holds while this is asked: nothing consults it once the reader has navigated.
 *
 * An empty collection opens on the United States. There is nothing to place, so
 * there is nothing to widen the frame for.
 */
export function initialView(
	grouped: ReadonlyMap<string, readonly Place[]>,
	places: readonly Place[],
): PlaceView {
	let placed = 0

	for (const list of grouped.values()) placed += list.length

	return placed === places.length ? UNITED_STATES_VIEW : WORLD
}
