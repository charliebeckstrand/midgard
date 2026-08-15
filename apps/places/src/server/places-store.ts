import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { parsePlace } from '../schemas/place'
import type { Place, PlaceDraft } from '../types'
import { createQueue, readJsonFile, writeJsonFile } from './json-file'

/**
 * The store: every place, in one JSON file under the app.
 *
 * It is the one module that knows where places live, so a gateway or a database
 * can replace this file without the handlers, the queries, or the components
 * changing at all.
 *
 * Every write goes through {@link serialize}, which is what keeps two requests
 * landing together from each reading the same list and writing back over one
 * another.
 */

const FILE = join(process.cwd(), '.data', 'places.json')

const serialize = createQueue()

/** Reads the file, or an empty list where it does not exist yet. */
async function readAll(): Promise<unknown[]> {
	const parsed = await readJsonFile(FILE)

	return Array.isArray(parsed) ? parsed : []
}

/** Writes the whole list, atomically. */
function writeAll(places: Place[]): Promise<void> {
	return writeJsonFile(FILE, places)
}

/**
 * Every stored place, newest visit first, dropping any record that no longer
 * reads as one — a hand-edited file must not put a point with no position on the
 * map.
 */
export async function listPlaces(): Promise<Place[]> {
	const stored = await readAll()

	const places: Place[] = []

	for (const record of stored) {
		const parsed = parsePlace(record)

		if (parsed.ok) places.push(parsed.value)
	}

	return places.sort((a, b) => b.visitedAt.localeCompare(a.visitedAt))
}

/** Appends one place, giving it its identity and its written-at stamp. */
export async function addPlace(draft: PlaceDraft): Promise<Place> {
	return serialize(async () => {
		const places = await listPlaces()

		const place: Place = { ...draft, id: randomUUID(), createdAt: new Date().toISOString() }

		await writeAll([place, ...places])

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
export async function updatePlace(id: string, draft: PlaceDraft): Promise<Place | null> {
	return serialize(async () => {
		const places = await listPlaces()

		const held = places.find((place) => place.id === id)

		if (held === undefined) return null

		const updated: Place = { ...draft, id: held.id, createdAt: held.createdAt }

		await writeAll(places.map((place) => (place.id === id ? updated : place)))

		return updated
	})
}

/**
 * Removes one place. `false` where none carried that id, so a repeated delete
 * reports the same thing the first one did rather than a silent success.
 */
export async function removePlace(id: string): Promise<boolean> {
	return serialize(async () => {
		const places = await listPlaces()

		const kept = places.filter((place) => place.id !== id)

		if (kept.length === places.length) return false

		await writeAll(kept)

		return true
	})
}
