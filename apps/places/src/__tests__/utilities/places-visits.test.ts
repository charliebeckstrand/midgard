import { describe, expect, it } from 'vitest'
import type { Place } from '../../types'
import { sortPlaces } from '../../utilities/places-visits'
import { place, placeOn } from '../fixtures'

/** A place whose newest visit has `rating`. */
function rated(id: string, rating: number): Place {
	return place(id, { visits: [{ id: `${id}-visit`, visitedAt: '2026-08-15', rating, photos: [] }] })
}

const names = (places: readonly Place[]) => places.map((item) => item.name)

describe('sortPlaces', () => {
	it('orders by name', () => {
		expect(names(sortPlaces([place('Cafe'), place('Antler'), place('Bistro')], 'name'))).toEqual([
			'Antler',
			'Bistro',
			'Cafe',
		])
	})

	it('puts the newest visit first, and ties in name order', () => {
		const places = [
			placeOn('Bistro', '2026-05-01'),
			placeOn('Cafe', '2026-09-01'),
			placeOn('Antler', '2026-05-01'),
		]

		expect(names(sortPlaces(places, 'visited'))).toEqual(['Cafe', 'Antler', 'Bistro'])
	})

	it('reads the newest visit, not an older one', () => {
		const repeat = place('Antler', {
			visits: [
				{ id: 'new', visitedAt: '2026-10-01', rating: 2, photos: [] },
				{ id: 'old', visitedAt: '2026-01-01', rating: 5, photos: [] },
			],
		})

		expect(names(sortPlaces([placeOn('Bistro', '2026-09-01'), repeat], 'visited'))).toEqual([
			'Antler',
			'Bistro',
		])
		expect(names(sortPlaces([rated('Bistro', 3), repeat], 'rating'))).toEqual(['Bistro', 'Antler'])
	})

	it('puts the highest rating first, and ties in name order', () => {
		const places = [rated('Cafe', 3), rated('Bistro', 4.5), rated('Antler', 3)]

		expect(names(sortPlaces(places, 'rating'))).toEqual(['Bistro', 'Antler', 'Cafe'])
	})

	it('leaves the input as it was', () => {
		const places = [place('B'), place('A')]

		sortPlaces(places, 'name')

		expect(names(places)).toEqual(['B', 'A'])
	})
})
