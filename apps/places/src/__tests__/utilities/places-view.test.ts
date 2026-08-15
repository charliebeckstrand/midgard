import { describe, expect, it } from 'vitest'
import {
	countryOf,
	drillInto,
	initialView,
	knownCountry,
	type PlaceView,
	regionOf,
	stateOf,
	UNITED_STATES,
	UNITED_STATES_VIEW,
	viewAtlas,
	viewCrumbs,
	viewForPlace,
	viewFrame,
	viewMark,
	viewRegion,
	WORLD,
} from '../../utilities/places-view'
import { place } from '../fixtures'

const OREGON: PlaceView = { country: UNITED_STATES, state: 'Oregon' }

const FRANCE: PlaceView = { country: 'France', state: null }

describe('viewAtlas', () => {
	// The United States is the only country this app carries a second atlas for,
	// so it is the only one that draws regions of its own.
	it('draws states inside the United States and countries everywhere else', () => {
		expect(viewAtlas(WORLD)).toBe('countries')

		expect(viewAtlas(FRANCE)).toBe('countries')

		expect(viewAtlas(UNITED_STATES_VIEW)).toBe('states')

		expect(viewAtlas(OREGON)).toBe('states')
	})
})

describe('viewRegion', () => {
	it('answers with nothing for a whole atlas', () => {
		expect(viewRegion(WORLD)).toBeNull()

		expect(viewRegion(UNITED_STATES_VIEW)).toBeNull()
	})

	it('answers with the one region a view is cut to', () => {
		expect(viewRegion(FRANCE)).toBe('France')

		expect(viewRegion(OREGON)).toBe('Oregon')
	})
})

describe('viewFrame', () => {
	it('answers with nothing for the world', () => {
		expect(viewFrame(WORLD)).toBeNull()
	})

	// Inside the United States the frame draws every state and is cut to none of
	// them, so the region is `null` while the frame plainly names a country.
	it('names the United States, which is a frame and not a cut', () => {
		expect(viewRegion(UNITED_STATES_VIEW)).toBeNull()

		expect(viewFrame(UNITED_STATES_VIEW)).toBe(UNITED_STATES)
	})

	it('names the one region a drill cut to', () => {
		expect(viewFrame(FRANCE)).toBe('France')

		expect(viewFrame(OREGON)).toBe('Oregon')
	})
})

describe('viewMark', () => {
	it('has nothing to designate at the world', () => {
		expect(viewMark(WORLD)).toBeNull()
	})

	it('marks a country among the countries', () => {
		expect(viewMark(FRANCE)).toEqual({ scope: 'countries', region: 'France' })
	})

	// The United States would otherwise be the one region on the map a reader
	// could never mark: they cross into it and it stops being somewhere they are.
	it('marks the United States among the countries, while its atlas draws states', () => {
		expect(viewAtlas(UNITED_STATES_VIEW)).toBe('states')

		expect(viewMark(UNITED_STATES_VIEW)).toEqual({ scope: 'countries', region: UNITED_STATES })
	})

	it('marks a state among the states', () => {
		expect(viewMark(OREGON)).toEqual({ scope: 'states', region: 'Oregon' })
	})
})

describe('stateOf and countryOf', () => {
	const held = place('a', { state: 'Oregon', country: 'United States' })

	it('read the field each atlas falls back to', () => {
		expect(stateOf(held)).toBe('Oregon')

		expect(countryOf(held)).toBe('United States')
	})

	it('answer with nothing where the geocoder named neither', () => {
		expect(stateOf(place('b'))).toBeUndefined()

		expect(countryOf(place('b'))).toBeUndefined()
	})
})

describe('drillInto', () => {
	it('opens a country from the world', () => {
		expect(drillInto(WORLD, 'France')).toEqual(FRANCE)
	})

	// The crossing: picked on the world map the United States opens as a country,
	// and the atlas under it becomes the states.
	it('crosses into the states atlas at the United States', () => {
		const opened = drillInto(WORLD, UNITED_STATES)

		expect(opened).toEqual(UNITED_STATES_VIEW)

		expect(viewAtlas(opened)).toBe('states')
	})

	it('opens a state from inside the United States, keeping the country', () => {
		expect(drillInto(UNITED_STATES_VIEW, 'Oregon')).toEqual(OREGON)
	})

	it('replaces the state a view already held', () => {
		expect(drillInto(OREGON, 'Nevada')).toEqual({ country: UNITED_STATES, state: 'Nevada' })
	})
})

describe('viewCrumbs', () => {
	it('names the world as the page itself', () => {
		expect(viewCrumbs(WORLD).map((crumb) => crumb.label)).toEqual(['Places'])
	})

	it('adds a step per level', () => {
		expect(viewCrumbs(FRANCE).map((crumb) => crumb.label)).toEqual(['Places', 'France'])

		expect(viewCrumbs(OREGON).map((crumb) => crumb.label)).toEqual([
			'Places',
			UNITED_STATES,
			'Oregon',
		])
	})

	// Every crumb but the last is a way back, so each must carry the view it
	// returns to — the country crumb inside a state goes to that country whole.
	it('carries the view each step goes back to', () => {
		const crumbs = viewCrumbs(OREGON)

		expect(crumbs[0]?.view).toEqual(WORLD)

		expect(crumbs[1]?.view).toEqual(UNITED_STATES_VIEW)

		expect(crumbs[2]?.view).toEqual(OREGON)
	})
})

describe('regionOf', () => {
	it('inverts a grouping to the region holding each place', () => {
		const grouped = new Map([
			['Oregon', [place('a')]],
			['Nevada', [place('b'), place('c')]],
		])

		expect([...regionOf(grouped)]).toEqual([
			['a', 'Oregon'],
			['b', 'Nevada'],
			['c', 'Nevada'],
		])
	})

	it('answers with nothing for a grouping that placed nothing', () => {
		expect(regionOf(new Map()).size).toBe(0)
	})
})

describe('knownCountry', () => {
	// The world is drawn at 110m, where the outline generalizes away exactly the
	// places a travel log is full of. A place the finer atlas could put in a state
	// is in the United States, whatever the geocoder called its country.
	it('answers with the United States for a place the states atlas placed', () => {
		const coastal = place('lighthouse', { country: 'United States' })

		expect(knownCountry(new Map([['lighthouse', 'Oregon']]))(coastal)).toBe(UNITED_STATES)
	})

	// It declines rather than guessing, which is what sends the place on to the
	// geometry and then to its own country name.
	it('declines for a place the states atlas could not place', () => {
		expect(knownCountry(new Map())(place('louvre', { country: 'France' }))).toBeUndefined()
	})
})

describe('viewForPlace', () => {
	it('goes to the state the states atlas put a place in', () => {
		const held = place('a')

		expect(viewForPlace(new Map([['a', 'Oregon']]), held)).toEqual(OREGON)
	})

	// The world rather than the place's own country: a country is reachable only
	// by the name its atlas gives it, and a place carries the geocoder's.
	it('goes to the world for a place the states atlas could not place', () => {
		const abroad = place('louvre', { country: 'France' })

		expect(viewForPlace(new Map(), abroad)).toEqual(WORLD)
	})

	it('finds a place among several regions', () => {
		const states = new Map([
			['a', 'Oregon'],
			['b', 'Nevada'],
		])

		expect(viewForPlace(states, place('b'))).toEqual({ country: UNITED_STATES, state: 'Nevada' })
	})
})

describe('initialView', () => {
	// The question is asked of the geometry and never of a country name: a place
	// the states atlas can place is a place in the United States, whatever the
	// geocoder called its country.
	it('opens on the United States where the states atlas holds every place', () => {
		const places = [place('a'), place('b')]

		const states = new Map([
			['a', 'Oregon'],
			['b', 'Oregon'],
		])

		expect(initialView(states, places)).toEqual(UNITED_STATES_VIEW)
	})

	it('opens on the world where one place falls outside the states', () => {
		const places = [place('a'), place('paris')]

		expect(initialView(new Map([['a', 'Oregon']]), places)).toEqual(WORLD)
	})

	// Nothing to place is nothing to widen the frame for.
	it('opens on the United States for an empty collection', () => {
		expect(initialView(new Map(), [])).toEqual(UNITED_STATES_VIEW)
	})
})
