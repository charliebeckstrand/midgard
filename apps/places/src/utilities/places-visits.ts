import type { Place, PlaceDraft, Visit } from '../types'

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
 * A stored place as the draft that writes it back unchanged. A change to the
 * visits of a place sends the whole place, because Mimir replaces a place as
 * one record.
 */
export function placeDraft({ id: _id, createdAt: _createdAt, ...draft }: Place): PlaceDraft {
	return draft
}
