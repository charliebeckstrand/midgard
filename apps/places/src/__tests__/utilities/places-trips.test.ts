import { describe, expect, it } from 'vitest'
import {
	isTrip,
	placeCount,
	placesByTrip,
	placesOffTrips,
	recordCount,
	sortTrips,
	withinTrip,
} from '../../utilities/places-trips'
import { place, trip } from '../fixtures'

describe('placesByTrip', () => {
	it('lists the places of each trip by the visits that name it, newest visit first', () => {
		const early = place('early', {
			visits: [{ id: 'v1', visitedAt: '2026-09-25', rating: 0, photos: [], tripId: 't1' }],
		})

		const late = place('late', {
			visits: [
				{ id: 'v2', visitedAt: '2026-09-27', rating: 0, photos: [], tripId: 't1' },
				{ id: 'v3', visitedAt: '2026-01-02', rating: 0, photos: [] },
			],
		})

		const home = place('home')

		const byTrip = placesByTrip([early, home, late])

		expect(byTrip.get('t1')).toEqual([late, early])

		expect([...byTrip.keys()]).toEqual(['t1'])
	})

	it('lists a place once, whatever the number of its visits on the trip', () => {
		const twice = place('twice', {
			visits: [
				{ id: 'v1', visitedAt: '2026-09-26', rating: 0, photos: [], tripId: 't1' },
				{ id: 'v2', visitedAt: '2026-09-25', rating: 0, photos: [], tripId: 't1' },
			],
		})

		expect(placesByTrip([twice]).get('t1')).toEqual([twice])
	})
})

describe('sortTrips', () => {
	it('puts the newest first day first, then the names in order', () => {
		const trips = [
			trip('a', { name: 'Lisbon', startsOn: '2026-04-01' }),
			trip('b', { name: 'Porto', startsOn: '2026-10-01' }),
			trip('c', { name: 'Kyoto', startsOn: '2026-10-01' }),
		]

		expect(sortTrips(trips).map((held) => held.id)).toEqual(['c', 'b', 'a'])
	})
})

describe('withinTrip', () => {
	it('takes the first and the last day, and refuses the days around them', () => {
		const held = trip('t1', { startsOn: '2026-09-25', endsOn: '2026-09-28' })

		expect(withinTrip(held, '2026-09-25')).toBe(true)

		expect(withinTrip(held, '2026-09-28')).toBe(true)

		expect(withinTrip(held, '2026-09-24')).toBe(false)

		expect(withinTrip(held, '2026-09-29')).toBe(false)
	})
})

describe('placesOffTrips', () => {
	it('keeps the places that no visit puts on one of the trips', () => {
		const lisbon = trip('lisbon')

		const onTrip = place('tower', {
			visits: [
				{ id: 'v2', visitedAt: '2026-09-26', rating: 4, photos: [], tripId: 'lisbon' },
				{ id: 'v1', visitedAt: '2025-01-01', rating: 3, photos: [] },
			],
		})

		const onOtherTrip = place('cafe', {
			visits: [{ id: 'v3', visitedAt: '2026-05-01', rating: 4, photos: [], tripId: 'rome' }],
		})

		const offTrip = place('market')

		expect(placesOffTrips([onTrip, onOtherTrip, offTrip], [lisbon])).toEqual([onOtherTrip, offTrip])

		expect(placesOffTrips([onTrip, offTrip], [])).toEqual([onTrip, offTrip])
	})
})

describe('isTrip', () => {
	it('tells a trip from a place', () => {
		expect(isTrip(trip('lisbon'))).toBe(true)

		expect(isTrip(place('tower'))).toBe(false)
	})
})

describe('recordCount', () => {
	it('names the kinds that it has', () => {
		expect(recordCount(3, 0)).toBe('3 places')

		expect(recordCount(0, 1)).toBe('1 trip')

		expect(recordCount(2, 1)).toBe('2 places and 1 trip')

		expect(recordCount(1, 2)).toBe('1 place and 2 trips')
	})
})

describe('placeCount', () => {
	it('names one place and several places', () => {
		expect(placeCount(1)).toBe('1 place')

		expect(placeCount(3)).toBe('3 places')
	})
})
