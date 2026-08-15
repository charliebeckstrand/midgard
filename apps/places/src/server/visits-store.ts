import { join } from 'node:path'
import { createQueue, readJsonFile, writeJsonFile } from './json-file'

/**
 * The visited states, in one JSON file beside the places.
 *
 * Its own store rather than a field on a place, because the whole point of the
 * designation is that it holds for a state the reader has recorded nothing in:
 * somewhere driven through, or somewhere they lived before they kept a list.
 * Derived from the places, an empty state could never be marked at all.
 *
 * A state is named the way the atlas names it, which is what the map draws and
 * what the drill reports — not the string a geocoder happened to return.
 */

const FILE = join(process.cwd(), '.data', 'visits.json')

const serialize = createQueue()

/** The state names in an unknown document, dropping anything that is not one. */
function parseStates(input: unknown): string[] {
	if (!Array.isArray(input)) return []

	const names = new Set<string>()

	for (const entry of input) {
		if (typeof entry !== 'string') continue

		const trimmed = entry.trim()

		if (trimmed !== '') names.add(trimmed)
	}

	return [...names].sort((a, b) => a.localeCompare(b))
}

/**
 * Every visited state, alphabetically.
 *
 * `seed` answers for a store with no file yet. It is a parameter rather than a
 * read of the places, because "a state holding a place is a state you went to"
 * is a rule about the domain and not about where visits are kept — held here,
 * this store would have to know the other one, and neither could be replaced on
 * its own. The route composes them.
 *
 * A read-time default, not a migration: nothing is written until the reader
 * toggles something, and that first toggle persists the seeded set with their
 * change applied. From then on the file is the whole answer and the seed is
 * never asked again.
 */
export async function listVisits(seed?: () => Promise<string[]>): Promise<string[]> {
	const stored = await readJsonFile(FILE)

	if (stored === undefined) return seed === undefined ? [] : parseStates(await seed())

	return parseStates(stored)
}

/**
 * Marks one state visited or not, and answers with the whole set.
 *
 * The whole set rather than the one change, so a caller never has to hold a copy
 * it patched itself — and so the first write of a seeded file hands back what it
 * settled on. `seed` is {@link listVisits}'s, and matters on exactly one call:
 * the first write, which must not drop what the reader already had.
 */
export async function setVisit(
	state: string,
	visited: boolean,
	seed?: () => Promise<string[]>,
): Promise<string[]> {
	return serialize(async () => {
		const held = new Set(await listVisits(seed))

		if (visited) held.add(state)
		else held.delete(state)

		const next = parseStates([...held])

		await writeJsonFile(FILE, next)

		return next
	})
}
