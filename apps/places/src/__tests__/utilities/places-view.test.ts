import { describe, expect, it } from 'vitest'
import type { Place } from '../../types'
import {
	drillInto,
	initialView,
	type PlaceView,
	UNITED_STATES,
	UNITED_STATES_VIEW,
	viewAtlas,
	viewCrumbs,
	viewFallback,
	viewFrame,
	viewMark,
	viewRegion,
	WORLD,
} from '../../utilities/places-view'

/** One place, with only the fields a view reads named at the call site. */
function place(id: string, fields: Partial<Place> = {}): Place {
	return {
		id,
		name: id,
		category: 'food',
		address: 'somewhere',
		latitude: 44.63,
		longitude: -124.05,
		rating: 0,
		visitedAt: '2026-08-15',
		createdAt: '2026-08-15T18:00:00.000Z',
		...fields,
	}
}

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

describe('viewFallback', () => {
	const held = place('a', { state: 'Oregon', country: 'United States' })

	it('reads the state under a states atlas and the country under a countries atlas', () => {
		expect(viewFallback(UNITED_STATES_VIEW)(held)).toBe('Oregon')

		expect(viewFallback(WORLD)(held)).toBe('United States')
	})

	// `groupPlacesByRegion` is memoised on it, so a fresh function each call would
	// regroup every place on every render.
	it('hands back a stable identity', () => {
		expect(viewFallback(WORLD)).toBe(viewFallback(FRANCE))

		expect(viewFallback(UNITED_STATES_VIEW)).toBe(viewFallback(OREGON))
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

describe('initialView', () => {
	// The question is asked of the geometry and never of a country name: a place
	// the states atlas can place is a place in the United States, whatever the
	// geocoder called its country.
	it('opens on the United States where the states atlas holds every place', () => {
		const places = [place('a'), place('b')]

		const grouped = new Map([['Oregon', places]])

		expect(initialView(grouped, places)).toEqual(UNITED_STATES_VIEW)
	})

	it('opens on the world where one place falls outside the states', () => {
		const places = [place('a'), place('paris')]

		const grouped = new Map([['Oregon', [places[0] as Place]]])

		expect(initialView(grouped, places)).toEqual(WORLD)
	})

	// Nothing to place is nothing to widen the frame for.
	it('opens on the United States for an empty collection', () => {
		expect(initialView(new Map(), [])).toEqual(UNITED_STATES_VIEW)
	})

	it('counts across every region, not within one', () => {
		const places = [place('a'), place('b'), place('c')]

		const grouped = new Map([
			['Oregon', [places[0] as Place]],
			['Nevada', [places[1] as Place, places[2] as Place]],
		])

		expect(initialView(grouped, places)).toEqual(UNITED_STATES_VIEW)
	})
})
