import { randomUUID } from 'node:crypto'
import { parsePlace } from '../schemas/place'
import type { Place, PlaceDraft } from '../types'
import { readDocument, writeDocument } from './documents'
import { createQueue } from './json-file'

/**
 * The store: the places of each user, in one document for each user (see `documents.ts`).
 *
 * It is the one module that the handlers call for places, so a change to the
 * storage does not reach the handlers, the queries, or the components.
 *
 * Every write goes through {@link serialize}, which is what keeps two requests
 * landing together from each reading the same list and writing back over one
 * another. The queue is in the process, so it holds while the service runs one
 * instance, which `.do/app.yaml` sets.
 */

const serialize = createQueue()

/** The most places one user keeps, so no account can fill the database. */
export const MAX_PLACES = 1000

/** Reads the document, or an empty list where it does not exist yet. */
async function readAll(userId: string): Promise<unknown[]> {
	const parsed = await readDocument(userId, 'places')

	return Array.isArray(parsed) ? parsed : []
}

/** Writes the whole list, atomically. */
function writeAll(userId: string, places: unknown[]): Promise<void> {
	return writeDocument(userId, 'places', places)
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
	const stored = await readAll(userId)

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
	return serialize(async () => {
		const stored = await readAll(userId)

		if (stored.length >= MAX_PLACES) return null

		const place: Place = { ...draft, id: randomUUID(), createdAt: new Date().toISOString() }

		await writeAll(userId, [place, ...stored])

		return place
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
	return serialize(async () => {
		const stored = await readAll(userId)

		const held = stored.map(parsePlace).find((parsed) => parsed.ok && parsed.value.id === id)

		if (held === undefined || !held.ok) return null

		const updated: Place = { ...draft, id, createdAt: held.value.createdAt }

		await writeAll(
			userId,
			stored.map((record) => (hasId(record, id) ? updated : record)),
		)

		return updated
	})
}

/**
 * Removes one place. `false` where none carried that id, so a repeated delete
 * reports the same thing the first one did rather than a silent success.
 */
export async function removePlace(userId: string, id: string): Promise<boolean> {
	return serialize(async () => {
		const stored = await readAll(userId)

		const kept = stored.filter((record) => !hasId(record, id))

		if (kept.length === stored.length) return false

		await writeAll(userId, kept)

		return true
	})
}
