import type { MapFeatureCollection } from 'ui/modules/map'
import type { Place, VisitScope } from '../types'
import { regionName } from './places-geography'

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
 * Regions no map here draws.
 *
 * Antarctica alone, and for how it looks rather than for what it is. Every world
 * projection stretches the pole into a band across the foot of the frame — a
 * flat smear that reads as a drawing fault, and worse under Mercator than under
 * most — and it takes a tenth of the frame's height to say nothing a reader of
 * this app is looking for.
 *
 * A place recorded there still draws, because a dot is a position and not a
 * membership. It groups under no country and opens no drill, which is the same
 * answer the map gives for a place at sea.
 */
const UNDRAWN = new Set(['Antarctica'])

/**
 * An atlas as the map draws it, which is every region but {@link UNDRAWN}.
 *
 * Applied to both atlases rather than to the world alone: no state carries one
 * of these names, so the states atlas passes through untouched and neither the
 * query nor its callers need to know which grain they hold.
 */
export function drawnRegions(regions: MapFeatureCollection | null): MapFeatureCollection | null {
	if (regions === null) return null

	const drawn = regions.features.filter((region) => !UNDRAWN.has(regionName(region)))

	return drawn.length === regions.features.length
		? regions
		: { type: 'FeatureCollection', features: drawn }
}

/**
 * How far outside the world outline a place may sit and still be rescued by the
 * nearest country, in kilometres.
 *
 * It is a fact about `world-atlas` at 110m and not a preference. That drawing
 * runs a coastline inland of the harbours and beach towns a travel log is full
 * of — Newport, Oregon falls 3.1 km outside the United States as it is drawn —
 * and 50 km covers that generalization with room to spare. Whatever lies outside
 * every country of a world atlas is water, so the nearest coast is the right
 * answer and a generous tolerance costs nothing.
 *
 * The states atlas is given none. It is drawn at 10m, fine enough to contain its
 * own coastline, and what lies outside its regions is Canada and Mexico: at
 * 10 km a place in Tijuana snaps to California, which is a worse answer than
 * none.
 */
export const COUNTRY_SNAP_KM = 50

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

/**
 * Which atlas a view draws. It is the visit scope: an atlas divides the world
 * one way, and a region is marked visited under the atlas that named it — so
 * `viewMark`'s scope crosses into the store without a conversion.
 */
export type PlaceAtlas = VisitScope

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

/**
 * The geocoder's state, which is what answers where the states atlas cannot: a
 * coastal place sits a little outside the generalized outline that plainly holds
 * it. Handed to `groupPlacesByRegion`, whose fallback this is.
 *
 * The countries atlas has a better answer than any name — see
 * {@link knownCountry}, which the app hands the countries grouping instead.
 */
export function stateOf(place: Place): string | undefined {
	return place.state
}

/**
 * A grouping inverted: which region holds each place, by the place's id.
 *
 * The grouping answers "what is in this region" and three readers ask the
 * opposite — which region a picked place stands in, which places another atlas
 * already settled, and what a row's region column says. Each walked the grouping
 * its own way; one inversion answers all three in one pass.
 */
export function regionOf(grouped: ReadonlyMap<string, readonly Place[]>): Map<string, string> {
	const held = new Map<string, string>()

	for (const [region, list] of grouped) {
		for (const place of list) held.set(place.id, region)
	}

	return held
}

/**
 * Which state a place is in, as a row that has to print one says it: the drawn
 * geometry's answer first, {@link stateOf} second, and the empty string where
 * neither answers.
 *
 * The order is the one the whole app trusts. A 10m atlas that holds a point
 * beats a name a geocoder returned, and the name is what carries the question
 * past the atlas's edge — the states are drawn for one country, and outside it
 * the subdivision the geocoder named is the nearest thing to a state there is.
 *
 * Unchecked, unlike the same fallback inside `groupPlacesByRegion`, which tests
 * its name against the drawn regions before trusting it. There is nothing to
 * test against here: a subdivision outside the drawn atlas is a name to print
 * and never a region to open.
 *
 * `statesByPlace` is {@link regionOf} of the grouping against the states atlas.
 * Empty rather than `undefined`, because every reader of this is a cell.
 */
export function stateLabel(statesByPlace: ReadonlyMap<string, string>, place: Place): string {
	return statesByPlace.get(place.id) ?? stateOf(place) ?? ''
}

/**
 * The geocoder's country, which answers where the world outline cannot.
 * `groupPlacesByRegion`'s fallback for the countries atlas.
 */
export function countryOf(place: Place): string | undefined {
	return place.country
}

/**
 * What the states atlas already settled, for the countries grouping to trust
 * ahead of its own geometry — `groupPlacesByRegion`'s `known`.
 *
 * A place the states atlas can put in a state is in the United States, whatever
 * the geocoder called its country. That matters because the world is drawn at
 * 110m, where the outline generalizes away exactly the places a travel log is
 * full of: a harbour, a beach, a coastal town all sit a little outside the
 * country that plainly holds them. Under the name alone they fell through to
 * "United States", which Natural Earth does not draw, and read as belonging
 * nowhere.
 *
 * So the two atlases answer together, and the finer one answers first. The app
 * already groups against the states for its own reasons, and {@link regionOf}
 * of that grouping is the answer — which also makes this the cheap path, since a
 * place it names skips the world's bounds test and ring walk entirely.
 */
export function knownCountry(
	statesByPlace: ReadonlyMap<string, string>,
): (place: Place) => string | undefined {
	return (place) => (statesByPlace.has(place.id) ? UNITED_STATES : undefined)
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
 * The regions a picked group stands in, from the drawn one down — what the open
 * panel names itself with.
 *
 * A dot on the world map is a country's worth of places, and a summary dot there
 * is often one town's worth: every place it merged sits in the same state, and
 * "United States of America" is a poorer answer than the state the reader can
 * see it stands on. Where the group agrees on a state, the trail says so and the
 * panel lists that state rather than the country.
 *
 * Where it does not agree — a summary spanning two states, or a country this app
 * draws no states for — the trail stops at the drawn region, because a step it
 * cannot name is a step that would list the wrong places.
 *
 * The last step is always the one the panel lists. Nothing is repeated from the
 * page's own trail: inside the United States the drawn region already is the
 * state, so the trail is that state alone.
 */
export function groupTrail(
	drawn: string | null,
	group: readonly Place[],
	statesByPlace: ReadonlyMap<string, string>,
): string[] {
	if (drawn === null) return []

	const states = new Set(group.map((place) => statesByPlace.get(place.id)))

	const [only] = states

	return states.size === 1 && only !== undefined && only !== drawn ? [drawn, only] : [drawn]
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
export function viewForPlace(states: ReadonlyMap<string, string>, place: Place): PlaceView {
	const state = states.get(place.id)

	return state === undefined ? WORLD : { country: UNITED_STATES, state }
}

/**
 * The view one step out, or `null` where there is nowhere further out to go.
 *
 * It is the trail's second-to-last step, named directly: reading it back out of
 * {@link viewCrumbs} by index worked and said nothing about what it meant.
 */
export function viewUp(view: PlaceView): PlaceView | null {
	if (view.state !== null) return { country: view.country, state: null }

	return view.country === null ? null : WORLD
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
 * It is the smallest of the two geographies this app draws, not of every
 * geography there is: a collection held entirely in Japan opens on the world,
 * because opening on Japan would mean grouping by country to find that out, and
 * that means fetching the countries atlas on the path this rule exists to keep
 * clear.
 *
 * `statesByPlace` must be {@link regionOf} of the grouping against the states
 * atlas, which is what the app holds while this is asked: nothing consults it
 * once the reader has navigated.
 *
 * An empty collection opens on the United States. There is nothing to place, so
 * there is nothing to widen the frame for.
 */
export function initialView(
	statesByPlace: ReadonlyMap<string, string>,
	places: readonly Place[],
): PlaceView {
	return statesByPlace.size === places.length ? UNITED_STATES_VIEW : WORLD
}
