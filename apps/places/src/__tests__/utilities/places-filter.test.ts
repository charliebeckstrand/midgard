import { describe, expect, it } from 'vitest'
import type { Place } from '../../types'
import {
	filterPlaces,
	filterTrips,
	fromDay,
	hasActiveFilter,
	type PlaceFilterValue,
	showsKind,
	toDay,
} from '../../utilities/places-filter'
import { place, placeOn, trip } from '../fixtures'

/** A committed span, in the shape the relative DatePicker writes. */
function span(from: string, to: string) {
	return { from: fromDay(from), to: fromDay(to) }
}

describe('toDay and fromDay', () => {
	it('round-trips a day through the local clock a visit was recorded against', () => {
		expect(toDay(fromDay('2026-08-15'))).toBe('2026-08-15')

		expect(toDay(new Date(2026, 0, 5))).toBe('2026-01-05')
	})

	it('pads a month and a day to two figures', () => {
		expect(toDay(new Date(2026, 8, 9))).toBe('2026-09-09')
	})
})

describe('hasActiveFilter', () => {
	it('reads an empty bar as narrowing nothing', () => {
		expect(hasActiveFilter({})).toBe(false)
	})

	// `Filters` leaves a cleared slot present and `undefined`, so the count of keys
	// is not the answer — an emptied field must read as cleared.
	it('reads a cleared field as narrowing nothing', () => {
		expect(hasActiveFilter({ categories: undefined })).toBe(false)

		expect(hasActiveFilter({ categories: [] })).toBe(false)

		expect(hasActiveFilter({ visited: [] })).toBe(false)
	})

	it('reads any set field as narrowing something', () => {
		expect(hasActiveFilter({ categories: ['food'] })).toBe(true)

		expect(hasActiveFilter({ visitedRegions: 'visited' })).toBe(true)

		expect(hasActiveFilter({ visited: [span('2026-01-01', '2026-12-31')] })).toBe(true)
	})
})

describe('filterPlaces', () => {
	const PLACES: Place[] = [
		placeOn('food', '2026-08-15', { category: 'food', country: 'United States' }),
		placeOn('nature', '2026-01-02', { category: 'nature', country: 'France' }),
		placeOn('nowhere', '2025-06-30', { category: 'other', country: undefined }),
	]

	function ids(filter: PlaceFilterValue): string[] {
		return filterPlaces(PLACES, filter).map((held) => held.id)
	}

	it('admits everything under an empty bar, in the order it was given', () => {
		expect(ids({})).toEqual(['food', 'nature', 'nowhere'])
	})

	it('narrows to the picked categories', () => {
		expect(ids({ categories: ['food', 'nature'] })).toEqual(['food', 'nature'])
	})

	// An empty list is the reader having turned every category off, which is not
	// the absent field that admits all.
	it('admits nothing where every category is turned off', () => {
		expect(ids({ categories: [] })).toEqual([])
	})

	// The paint filter decides which regions carry the visited fill and never
	// which dots are drawn: a place stands where it stands whatever the region
	// under it is marked.
	it('draws every place whatever the paint filter says', () => {
		expect(ids({ visitedRegions: 'visited' })).toEqual(['food', 'nature', 'nowhere'])

		expect(ids({ visitedRegions: 'unvisited' })).toEqual(['food', 'nature', 'nowhere'])
	})

	it('narrows to the committed spans, both ends included', () => {
		expect(ids({ visited: [span('2026-08-15', '2026-08-31')] })).toEqual(['food'])

		expect(ids({ visited: [span('2026-01-01', '2026-12-31')] })).toEqual(['food', 'nature'])
	})

	it('admits a place inside any one of several spans', () => {
		expect(
			ids({ visited: [span('2025-06-01', '2025-06-30'), span('2026-08-01', '2026-08-31')] }),
		).toEqual(['food', 'nowhere'])
	})

	it('admits a place where any of its visits falls inside a span', () => {
		const twice = place('twice', {
			visits: [
				{ id: 'b', visitedAt: '2026-08-15', rating: 4, photos: [] },
				{ id: 'a', visitedAt: '2025-03-01', rating: 2, photos: [] },
			],
		})

		expect(
			filterPlaces([twice], { visited: [span('2025-03-01', '2025-03-31')] }).map((held) => held.id),
		).toEqual(['twice'])
	})

	// The picker writes an empty array as it clears, which must not empty the map.
	it('admits everything under an empty span list', () => {
		expect(ids({ visited: [] })).toEqual(['food', 'nature', 'nowhere'])
	})

	it('applies each field on its own', () => {
		expect(
			ids({ categories: ['food', 'nature'], visited: [span('2026-01-01', '2026-06-30')] }),
		).toEqual(['nature'])
	})
})

describe('filterTrips', () => {
	const trips = [
		trip('spring', { startsOn: '2026-04-01', endsOn: '2026-04-05' }),
		trip('fall', { startsOn: '2026-09-25', endsOn: '2026-10-02' }),
	]

	it('admits every trip without a span, whatever the categories', () => {
		expect(filterTrips(trips, { categories: ['food'] })).toEqual(trips)
	})

	it('admits a trip whose days overlap a span', () => {
		expect(filterTrips(trips, { visited: [span('2026-10-01', '2026-10-31')] })).toEqual([trips[1]])

		expect(filterTrips(trips, { visited: [span('2026-05-01', '2026-08-31')] })).toEqual([])
	})
})

describe('showsKind', () => {
	it('draws both kinds while the field is unset', () => {
		expect(showsKind({}, 'places', true)).toBe(true)

		expect(showsKind({}, 'trips', true)).toBe(true)
	})

	it('draws the picked kinds alone', () => {
		expect(showsKind({ show: ['trips'] }, 'places', true)).toBe(false)

		expect(showsKind({ show: ['trips'] }, 'trips', true)).toBe(true)
	})

	// The field shows only while the reader has a trip, so a link that hides the
	// places must not hide them from a reader who cannot see the field.
	it('draws the places while the reader has no trip', () => {
		expect(showsKind({ show: ['trips'] }, 'places', false)).toBe(true)
	})
})
