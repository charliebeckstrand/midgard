import { describe, expect, it, vi } from 'vitest'

// The paint filter is behind a flag. These cases read it with the flag on, and
// one case turns the flag off.
const flags = vi.hoisted(() => ({ visitedRegions: true }))

vi.mock('../../flags', () => ({ flags }))

import { fromDay } from '../../utilities/places-filter'
import {
	NOTHING_SELECTED,
	PANEL_START,
	type PlaceLocation,
	readLocation,
	writeLocation,
} from '../../utilities/places-url'
import { UNITED_STATES, WORLD } from '../../utilities/places-view'

/** An address, read. */
function read(query: string): PlaceLocation {
	return readLocation(new URLSearchParams(query))
}

/** A location, written back as a query string. */
function write(location: Partial<PlaceLocation>): string {
	return writeLocation({
		view: null,
		filter: {},
		selected: NOTHING_SELECTED,
		step: PANEL_START,
		adding: null,
		...location,
	}).toString()
}

/** The empty location, which is what an address states before the reader does anything. */
const NOTHING: PlaceLocation = {
	view: null,
	filter: {},
	selected: NOTHING_SELECTED,
	step: PANEL_START,
	adding: null,
}

describe('readLocation', () => {
	it('reads an empty address as nothing stated', () => {
		expect(read('')).toEqual(NOTHING)
	})

	// The mark that parts "the world" from "not written yet". Without it a reader
	// who walked out to the world would be sent back by their own reload.
	it('reads a country of "all" as the world', () => {
		expect(read('country=all').view).toEqual(WORLD)
	})

	// The mark this app wrote before it had a word for it. A link is allowed to
	// outlive the address that wrote it.
	it('still reads an empty country as the world', () => {
		expect(read('country=').view).toEqual(WORLD)
	})

	it('reads a country and a state', () => {
		expect(read('country=France').view).toEqual({ country: 'France', state: null })

		expect(read(`country=${encodeURIComponent(UNITED_STATES)}&state=Oregon`).view).toEqual({
			country: UNITED_STATES,
			state: 'Oregon',
		})
	})

	it('reads every picked category, and drops one it does not know', () => {
		expect(read('category=food&category=nature&category=lunar').filter.categories).toEqual([
			'food',
			'nature',
		])
	})

	it('reads the paint filter, and drops a value that is neither', () => {
		expect(read('paint=visited').filter.visitedRegions).toBe('visited')

		expect(read('paint=unvisited').filter.visitedRegions).toBe('unvisited')

		expect(read('paint=maybe').filter.visitedRegions).toBeUndefined()
	})

	it('drops the paint filter while the feature is off', () => {
		flags.visitedRegions = false

		try {
			expect(read('paint=visited').filter.visitedRegions).toBeUndefined()
		} finally {
			flags.visitedRegions = true
		}
	})

	it('reads the committed spans as local days', () => {
		const spans = read('when=2026-01-01..2026-06-30&when=2026-08-01..2026-08-31').filter.visited

		expect(spans).toHaveLength(2)

		expect(spans?.[0]?.from).toEqual(fromDay('2026-01-01'))

		expect(spans?.[1]?.to).toEqual(fromDay('2026-08-31'))
	})

	// The address bar is an edge like any other: a reader can type into it, and a
	// link can outlive the app that wrote it.
	it('drops a span that is not a day pair', () => {
		expect(read('when=last-week').filter.visited).toBeUndefined()

		expect(read('when=2026-01-01..').filter.visited).toBeUndefined()

		expect(read('when=2026-01-01..2026-06-30&when=nonsense').filter.visited).toHaveLength(1)
	})

	// The shape alone would take this one: `2026-13-45` is a well-formed field
	// and not a date, and the reader would be handed a range they never asked
	// for. The schema's own day reader is what says no.
	it('drops a span shaped like days that names no date', () => {
		expect(read('when=2026-13-45..2026-13-46').filter.visited).toBeUndefined()
	})

	it('reads the open places', () => {
		expect(read('place=a1&place=b2').selected).toEqual({ places: ['a1', 'b2'], trips: [] })
	})

	it('reads the open trips, and both kinds where an address holds both', () => {
		expect(read('trip=t1').selected).toEqual({ places: [], trips: ['t1'] })

		expect(read('trip=t1&place=a1').selected).toEqual({ places: ['a1'], trips: ['t1'] })

		expect(read('trip=t1&open=a1').step).toEqual({ opened: 'a1', widened: false })
	})

	it('reads the kinds the map draws, and drops a kind it does not know', () => {
		expect(read('show=trips').filter.show).toEqual(['trips'])

		expect(read('show=people').filter.show).toBeUndefined()
	})

	// The step is what a reload opens the panel on: a place that the reader went
	// into from a list, or the list widened to the whole region.
	it('reads the step of the open panel', () => {
		expect(read('place=a1&place=b2&open=b2').step).toEqual({ opened: 'b2', widened: false })

		expect(read('place=a1&list=all').step).toEqual({ opened: null, widened: true })

		expect(read('place=a1&list=some').step).toEqual(PANEL_START)
	})

	it('drops a step with no open panel', () => {
		expect(read('open=b2&list=all').step).toEqual(PANEL_START)
	})

	it('reads the open form for a new place or trip, and drops any other value', () => {
		expect(read('add=place').adding).toBe('places')

		expect(read('add=trip').adding).toBe('trips')

		// The value this app wrote before it had trips. It is a stale field now.
		expect(read('add=true').adding).toBeNull()
	})

	it('drops empty fields rather than holding them', () => {
		expect(read('state=&category=&show=&place=&trip=&open=&list=&paint=&add=')).toEqual(NOTHING)
	})
})

describe('writeLocation', () => {
	it('writes nothing for an empty location', () => {
		expect(write({})).toBe('')
	})

	it('marks the world with a country of "all"', () => {
		expect(write({ view: WORLD })).toBe('country=all')
	})

	it('writes a country and a state', () => {
		expect(write({ view: { country: 'France', state: null } })).toBe('country=France')

		expect(write({ view: { country: UNITED_STATES, state: 'Oregon' } })).toBe(
			'country=United+States+of+America&state=Oregon',
		)
	})

	it('writes each field of the filter', () => {
		expect(
			write({
				filter: {
					categories: ['food', 'nature'],
					visitedRegions: 'visited',
					visited: [{ from: fromDay('2026-01-01'), to: fromDay('2026-06-30') }],
				},
			}),
		).toBe('category=food&category=nature&paint=visited&when=2026-01-01..2026-06-30')
	})

	it('writes the open places, then the open trips', () => {
		expect(write({ selected: { places: ['a1', 'b2'], trips: [] } })).toBe('place=a1&place=b2')

		expect(write({ selected: { places: ['a1'], trips: ['t1'] } })).toBe('place=a1&trip=t1')
	})

	it('writes the step of the open panel after its records', () => {
		expect(
			write({
				selected: { places: ['a1', 'b2'], trips: [] },
				step: { opened: 'b2', widened: true },
			}),
		).toBe('place=a1&place=b2&open=b2&list=all')

		expect(write({ selected: { places: [], trips: ['t1'] } })).toBe('trip=t1')
	})

	it('writes no step without an open panel', () => {
		expect(write({ step: { opened: 'b2', widened: true } })).toBe('')
	})

	it('writes the open form for a new record, and nothing while it is closed', () => {
		expect(write({ adding: 'places' })).toBe('add=place')

		expect(write({ adding: 'trips' })).toBe('add=trip')

		expect(write({ adding: null })).toBe('')
	})
})

describe('a location round trip', () => {
	// The address is the state, so what a reader lands on has to be what they
	// left — a round trip that loses a field loses their place.
	it('survives every field at once', () => {
		const location: PlaceLocation = {
			view: { country: UNITED_STATES, state: 'Oregon' },
			filter: {
				categories: ['food', 'shopping'],
				show: ['trips'],
				visitedRegions: 'unvisited',
				visited: [
					{ from: fromDay('2026-01-01'), to: fromDay('2026-06-30') },
					{ from: fromDay('2026-08-01'), to: fromDay('2026-08-31') },
				],
			},
			selected: { places: ['a1'], trips: ['b2'] },
			step: { opened: 'b2', widened: true },
			adding: 'trips',
		}

		expect(readLocation(writeLocation(location))).toEqual(location)
	})

	it('survives the world, which is the case the mark exists for', () => {
		const location: PlaceLocation = {
			view: WORLD,
			filter: {},
			selected: NOTHING_SELECTED,
			step: PANEL_START,
			adding: null,
		}

		expect(readLocation(writeLocation(location))).toEqual(location)
	})

	it('survives a region name carrying punctuation', () => {
		const location: PlaceLocation = {
			view: { country: "Côte d'Ivoire", state: null },
			filter: {},
			selected: NOTHING_SELECTED,
			step: PANEL_START,
			adding: null,
		}

		expect(readLocation(writeLocation(location))).toEqual(location)
	})
})
