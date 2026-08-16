import type { Place } from '../types'

/**
 * One stored place, with only the fields a case is about named at its call site.
 *
 * Shared because the defaults are the thing that drifts. Written out per file,
 * the same fixture carried a different `rating` and a different `address` in
 * each, so a test that read a field it had not named got a different answer
 * depending on which file it lived in — and a field added to {@link Place} broke
 * every copy separately.
 */
export function place(id: string, fields: Partial<Place> = {}): Place {
	return {
		id,
		name: id,
		category: 'food',
		address: '325 SW Bay Blvd, Newport, Oregon',
		latitude: 44.63,
		longitude: -124.05,
		rating: 4,
		visitedAt: '2026-08-15',
		createdAt: '2026-08-15T18:00:00.000Z',
		...fields,
	}
}

/** The same, placed at a position — which is what the geometry cases vary. */
export function placeAt(id: string, at: [number, number], fields: Partial<Place> = {}): Place {
	return place(id, { longitude: at[0], latitude: at[1], ...fields })
}
