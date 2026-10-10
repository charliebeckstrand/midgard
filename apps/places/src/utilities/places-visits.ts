import type { Place, PlaceDraft, Visit, VisitDraft } from '../types'

/**
 * The newest visit to a place. Mimir stores the visits newest first, and a
 * place always has one, so the first is the newest.
 */
export function latestVisit(place: Place): Visit {
	const [latest] = place.visits

	// Mimir refuses a place with no visits, so this only guards the index type.
	return latest ?? { id: place.id, visitedAt: place.createdAt.slice(0, 10), rating: 0, photos: [] }
}

/**
 * A stored visit as the draft that writes it back unchanged. A stored photo
 * reads as its key and an address, and a draft names a photo by its key alone.
 */
export function visitDraft(visit: Visit): VisitDraft {
	return { ...visit, photos: visit.photos.map((photo) => photo.key) }
}

/**
 * A stored place as the draft that writes it back unchanged. A change to the
 * visits of a place sends the whole place, because Mimir replaces a place as
 * one record.
 */
export function placeDraft({
	id: _id,
	createdAt: _createdAt,
	visits,
	...draft
}: Place): PlaceDraft {
	return { ...draft, visits: visits.map(visitDraft) }
}

/** The orders that a list of places can take. */
export type PlaceOrder = 'name' | 'visited' | 'rating'

/** The name of each order, as a picker shows it. */
export const PLACE_ORDER_LABEL: Readonly<Record<PlaceOrder, string>> = {
	name: 'Alphabetical',
	visited: 'Visited date',
	rating: 'Rating',
}

/**
 * The places in an order. The newest visit and the rating go highest first, and
 * places that tie stay in alphabetical order.
 */
export function sortPlaces(places: readonly Place[], order: PlaceOrder): Place[] {
	const byName = (a: Place, b: Place) => a.name.localeCompare(b.name)

	if (order === 'name') return [...places].sort(byName)

	const key =
		order === 'visited'
			? (place: Place) => latestVisit(place).visitedAt
			: (place: Place) => latestVisit(place).rating

	return [...places].sort((a, b) => {
		const left = key(a)
		const right = key(b)

		if (left === right) return byName(a, b)

		return left < right ? 1 : -1
	})
}
