import { randomUUID } from 'node:crypto'
import { parsePlace } from '../schemas/place'
import type { Place, PlaceDraft } from '../types'
import { changeDocument, readDocument } from './documents'

/**
 * The store: the places of each user, in one document for each user (see `documents.ts`).
 *
 * It is the one module that the handlers call for places, so a change to the
 * storage does not reach the handlers, the queries, or the components.
 *
 * Every write goes through `changeDocument`, which keeps two requests that land
 * together from each reading the same list and writing back over one another.
 */

/** The most places one user keeps, so no account can fill the database. */
export const MAX_PLACES = 1000

/** The stored records of a document, or an empty list where it does not exist yet. */
function records(document: unknown): unknown[] {
	return Array.isArray(document) ? document : []
}

/** Whether a stored record carries this id, whether or not the rest of it reads as a place. */
function hasId(record: unknown, id: string): boolean {
	return typeof record === 'object' && record !== null && (record as { id?: unknown }).id === id
}

/**
 * Every stored place, newest visit first, dropping any record that no longer
 * reads as one — a hand-edited document must not put a point with no position on the
 * map.
 *
 * The writes below do not start from this list. They change the stored records
 * and keep the others as they are, so a record that a stricter schema cannot
 * read stays in the document and does not disappear on the next write.
 */
export async function listPlaces(userId: string): Promise<Place[]> {
	const stored = records(await readDocument(userId, 'places'))

	const places: Place[] = []

	for (const record of stored) {
		const parsed = parsePlace(record)

		if (parsed.ok) places.push(parsed.value)
	}

	return places.sort((a, b) => b.visitedAt.localeCompare(a.visitedAt))
}

/**
 * Appends one place, giving it its identity and its written-at stamp. `null`
 * where the user already keeps {@link MAX_PLACES}.
 */
export async function addPlace(userId: string, draft: PlaceDraft): Promise<Place | null> {
	return changeDocument(userId, 'places', async (document) => {
		const stored = records(document)

		if (stored.length >= MAX_PLACES) return { result: null }

		const place: Place = { ...draft, id: randomUUID(), createdAt: new Date().toISOString() }

		return { result: place, value: [place, ...stored] }
	})
}

/**
 * Replaces one place, keeping the identity and the written-at stamp it already
 * had — those belong to the record, not to the draft that edits it.
 *
 * `null` where no place carries that id, which the handler answers as a 404
 * rather than writing a new record under an id the caller invented.
 */
export async function updatePlace(
	userId: string,
	id: string,
	draft: PlaceDraft,
): Promise<Place | null> {
	return changeDocument(userId, 'places', async (document) => {
		const stored = records(document)

		const held = stored.map(parsePlace).find((parsed) => parsed.ok && parsed.value.id === id)

		if (held === undefined || !held.ok) return { result: null }

		const updated: Place = { ...draft, id, createdAt: held.value.createdAt }

		return {
			result: updated,
			value: stored.map((record) => (hasId(record, id) ? updated : record)),
		}
	})
}

/**
 * Removes one place. `false` where none carried that id, so a repeated delete
 * reports the same thing the first one did rather than a silent success.
 */
export async function removePlace(userId: string, id: string): Promise<boolean> {
	return changeDocument(userId, 'places', async (document) => {
		const stored = records(document)

		const kept = stored.filter((record) => !hasId(record, id))

		if (kept.length === stored.length) return { result: false }

		return { result: true, value: kept }
	})
}
