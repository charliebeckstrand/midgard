import { randomUUID } from 'node:crypto'
import { parsePlace } from '../schemas/place'
import type { Place, PlaceDraft } from '../types'
import { createQueue, readJsonFile, userFile, writeJsonFile } from './json-file'

/**
 * The store: the places of each user, in one JSON file for each user.
 *
 * It is the one module that knows where places live, so a gateway or a database
 * can replace this file without the handlers, the queries, or the components
 * changing at all.
 *
 * Every write goes through {@link serialize}, which is what keeps two requests
 * landing together from each reading the same list and writing back over one
 * another.
 */

const serialize = createQueue()

/** Reads the file, or an empty list where it does not exist yet. */
async function readAll(userId: string): Promise<unknown[]> {
	const parsed = await readJsonFile(userFile(userId, 'places.json'))

	return Array.isArray(parsed) ? parsed : []
}

/** Writes the whole list, atomically. */
function writeAll(userId: string, places: Place[]): Promise<void> {
	return writeJsonFile(userFile(userId, 'places.json'), places)
}

/**
 * Every stored place, newest visit first, dropping any record that no longer
 * reads as one — a hand-edited file must not put a point with no position on the
 * map.
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

/** Appends one place, giving it its identity and its written-at stamp. */
export async function addPlace(userId: string, draft: PlaceDraft): Promise<Place> {
	return serialize(async () => {
		const places = await listPlaces(userId)

		const place: Place = { ...draft, id: randomUUID(), createdAt: new Date().toISOString() }

		await writeAll(userId, [place, ...places])

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
		const places = await listPlaces(userId)

		const held = places.find((place) => place.id === id)

		if (held === undefined) return null

		const updated: Place = { ...draft, id: held.id, createdAt: held.createdAt }

		await writeAll(
			userId,
			places.map((place) => (place.id === id ? updated : place)),
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
		const places = await listPlaces(userId)

		const kept = places.filter((place) => place.id !== id)

		if (kept.length === places.length) return false

		await writeAll(userId, kept)

		return true
	})
}
