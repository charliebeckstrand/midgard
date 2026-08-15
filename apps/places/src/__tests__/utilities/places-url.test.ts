import { describe, expect, it } from 'vitest'
import { fromDay } from '../../utilities/places-filter'
import { type PlaceLocation, readLocation, writeLocation } from '../../utilities/places-url'
import { UNITED_STATES, WORLD } from '../../utilities/places-view'

/** An address, read. */
function read(query: string): PlaceLocation {
	return readLocation(new URLSearchParams(query))
}

/** A location, written back as a query string. */
function write(location: Partial<PlaceLocation>): string {
	return writeLocation({ view: null, filter: {}, selected: [], ...location }).toString()
}

/** The empty location, which is what an address states before the reader does anything. */
const NOTHING: PlaceLocation = { view: null, filter: {}, selected: [] }

describe('readLocation', () => {
	it('reads an empty address as nothing stated', () => {
		expect(read('')).toEqual(NOTHING)
	})

	// The mark that parts "the world" from "not written yet". Without it a reader
	// who walked out to the world would be sent back by their own reload.
	it('reads a present but empty country as the world', () => {
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
		expect(read('place=a1&place=b2').selected).toEqual(['a1', 'b2'])
	})

	it('drops empty fields rather than holding them', () => {
		expect(read('state=&category=&place=&paint=')).toEqual(NOTHING)
	})
})

describe('writeLocation', () => {
	it('writes nothing for an empty location', () => {
		expect(write({})).toBe('')
	})

	it('marks the world with an empty country', () => {
		expect(write({ view: WORLD })).toBe('country=')
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

	it('writes the open places', () => {
		expect(write({ selected: ['a1', 'b2'] })).toBe('place=a1&place=b2')
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
				visitedRegions: 'unvisited',
				visited: [
					{ from: fromDay('2026-01-01'), to: fromDay('2026-06-30') },
					{ from: fromDay('2026-08-01'), to: fromDay('2026-08-31') },
				],
			},
			selected: ['a1', 'b2'],
		}

		expect(readLocation(writeLocation(location))).toEqual(location)
	})

	it('survives the world, which is the case the mark exists for', () => {
		const location: PlaceLocation = { view: WORLD, filter: {}, selected: [] }

		expect(readLocation(writeLocation(location))).toEqual(location)
	})

	it('survives a region name carrying punctuation', () => {
		const location: PlaceLocation = {
			view: { country: "Côte d'Ivoire", state: null },
			filter: {},
			selected: [],
		}

		expect(readLocation(writeLocation(location))).toEqual(location)
	})
})
