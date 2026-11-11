import { describe, expect, it } from 'vitest'
import type { Place } from '../../types'
import { ratedVisit, sortPlaces } from '../../utilities/visits'
import { makePlace, makePlaceOn } from '../fixtures'

/** A place whose newest visit has `rating`. */
function rated(id: string, rating: number): Place {
	return makePlace(id, {
		visits: [{ id: `${id}-visit`, visitedAt: '2026-08-15', rating, photos: [] }],
	})
}

const names = (places: readonly Place[]) => places.map((item) => item.name)

describe('sortPlaces', () => {
	it('orders by name', () => {
		expect(
			names(sortPlaces([makePlace('Cafe'), makePlace('Antler'), makePlace('Bistro')], 'name')),
		).toEqual(['Antler', 'Bistro', 'Cafe'])
	})

	it('puts the newest visit first, and ties in name order', () => {
		const places = [
			makePlaceOn('Bistro', '2026-05-01'),
			makePlaceOn('Cafe', '2026-09-01'),
			makePlaceOn('Antler', '2026-05-01'),
		]

		expect(names(sortPlaces(places, 'visited'))).toEqual(['Cafe', 'Antler', 'Bistro'])
	})

	it('reads the newest visit, not an older one', () => {
		const repeat = makePlace('Antler', {
			visits: [
				{ id: 'new', visitedAt: '2026-10-01', rating: 2, photos: [] },
				{ id: 'old', visitedAt: '2026-01-01', rating: 5, photos: [] },
			],
		})

		expect(names(sortPlaces([makePlaceOn('Bistro', '2026-09-01'), repeat], 'visited'))).toEqual([
			'Antler',
			'Bistro',
		])
		expect(names(sortPlaces([rated('Bistro', 3), repeat], 'rating'))).toEqual(['Bistro', 'Antler'])
	})

	it('rates a place by its newest rated visit', () => {
		const unrated = makePlace('Antler', {
			visits: [
				{ id: 'new', visitedAt: '2026-10-01', rating: 0, photos: [] },
				{ id: 'old', visitedAt: '2026-01-01', rating: 4, photos: [] },
			],
		})

		expect(names(sortPlaces([rated('Bistro', 3), unrated], 'rating'))).toEqual(['Antler', 'Bistro'])
	})

	it('puts the highest rating first, and ties in name order', () => {
		const places = [rated('Cafe', 3), rated('Bistro', 4.5), rated('Antler', 3)]

		expect(names(sortPlaces(places, 'rating'))).toEqual(['Bistro', 'Antler', 'Cafe'])
	})

	it('leaves the input as it was', () => {
		const places = [makePlace('B'), makePlace('A')]

		sortPlaces(places, 'name')

		expect(names(places)).toEqual(['B', 'A'])
	})
})

describe('ratedVisit', () => {
	it('skips a newer visit with no rating', () => {
		const repeat = makePlace('Antler', {
			visits: [
				{ id: 'new', visitedAt: '2026-10-01', rating: 0, photos: [] },
				{ id: 'mid', visitedAt: '2026-05-01', rating: 3.5, photos: [] },
				{ id: 'old', visitedAt: '2026-01-01', rating: 5, photos: [] },
			],
		})

		expect(ratedVisit(repeat)?.id).toBe('mid')
	})

	it('gives no visit where no visit has a rating', () => {
		expect(ratedVisit(rated('Antler', 0))).toBeUndefined()
	})
})
