import type { Photo, Place, Trip, Visit } from '../types'

/**
 * One stored place, with only the fields a case is about named at its call site.
 *
 * Shared because the defaults are the thing that drifts. Written out per file,
 * the same fixture carried a different `rating` and a different `address` in
 * each, so a test that read a field it had not named got a different answer
 * depending on which file it lived in, and a field added to {@link Place} broke
 * every copy separately.
 */
export function makePlace(id: string, fields: Partial<Place> = {}): Place {
	return {
		id,
		name: id,
		category: 'food',
		address: '325 SW Bay Blvd, Newport, Oregon',
		latitude: 44.63,
		longitude: -124.05,
		visits: [{ id: `${id}-visit`, visitedAt: '2026-08-15', rating: 4, photos: [] }],
		createdAt: '2026-08-15T18:00:00.000Z',
		...fields,
	}
}

/** The same, with one visit on `visitedAt`. */
export function makePlaceOn(id: string, visitedAt: string, fields: Partial<Place> = {}): Place {
	return makePlace(id, {
		visits: [{ id: `${id}-visit`, visitedAt, rating: 4, photos: [] }],
		...fields,
	})
}

/** The same, placed at a position, which is what the geometry cases vary. */
export function makePlaceAt(id: string, at: [number, number], fields: Partial<Place> = {}): Place {
	return makePlace(id, { longitude: at[0], latitude: at[1], ...fields })
}

/** One stored trip, with only the fields a case is about named at its call site. */
export function makeTrip(id: string, fields: Partial<Trip> = {}): Trip {
	return {
		id,
		name: id,
		address: 'Lisbon, Portugal',
		country: 'Portugal',
		latitude: 38.72,
		longitude: -9.14,
		startsOn: '2026-09-25',
		endsOn: '2026-09-28',
		photos: [],
		createdAt: '2026-09-29T18:00:00.000Z',
		...fields,
	}
}

/** One stored photo: its key, and the addresses of its view and its original, made from the key. */
export function makePhoto(key: string): Photo {
	return {
		key,
		url: `https://photos.example.com/${key}/view`,
		originalUrl: `https://photos.example.com/${key}`,
	}
}

/** One stored visit on the fixture day, with `photos`. */
export function makeVisit(id: string, photos: Photo[]): Visit {
	return { id, visitedAt: '2026-08-15', rating: 4, photos }
}
