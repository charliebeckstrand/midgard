import type { VisitScope, Visits } from '../types'
import { readDocument, writeDocument } from './documents'
import { createQueue } from './json-file'

/**
 * The visited regions of each user, in one document beside the places of that user.
 *
 * Its own store rather than a field on a place, because the whole point of the
 * designation is that it holds for a region the reader has recorded nothing in:
 * somewhere driven through, or somewhere they lived before they kept a list.
 * Derived from the places, an empty region could never be marked at all.
 *
 * A region is named the way its atlas names it, which is what the map draws and
 * what the drill reports — not the string a geocoder happened to return.
 *
 * The two scopes are kept apart rather than in one list of names, because the
 * names collide: Georgia is a state of the United States and Georgia is a
 * country, and one list cannot say which of them a reader marked.
 */

const serialize = createQueue()

/** The most regions one user marks in each scope, so no account can fill the database. */
export const MAX_VISITS = 1000

/** An empty set of both scopes, which is what a store with no document holds. */
function empty(): Visits {
	return { states: [], countries: [] }
}

/** The region names in an unknown list, dropping anything that is not one. */
function parseNames(input: unknown): string[] {
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
 * Reads an unknown document as the two scopes.
 *
 * A bare list is what this store wrote before it drew anything outside the
 * United States, so it reads as the states it was — the reader keeps the
 * designations they had, and the document is written in the new shape on their next
 * press.
 */
function parseVisits(input: unknown): Visits {
	if (Array.isArray(input)) return { states: parseNames(input), countries: [] }

	if (typeof input !== 'object' || input === null) return empty()

	const { states, countries } = input as { states?: unknown; countries?: unknown }

	return { states: parseNames(states), countries: parseNames(countries) }
}

/**
 * Every visited region, each scope alphabetical.
 *
 * `seed` answers for a store with no document yet. It is a parameter rather than a
 * read of the places, because "a region holding a place is a region you went to"
 * is a rule about the domain and not about where visits are kept — held here,
 * this store would have to know the other one, and neither could be replaced on
 * its own. The route composes them.
 *
 * A read-time default, not a migration: nothing is written until the reader
 * toggles something, and that first toggle persists the seeded set with their
 * change applied. From then on the document is the whole answer and the seed is
 * never asked again.
 */
export async function listVisits(userId: string, seed?: () => Promise<Visits>): Promise<Visits> {
	const stored = await readDocument(userId, 'visits')

	if (stored === undefined) return seed === undefined ? empty() : parseVisits(await seed())

	return parseVisits(stored)
}

/**
 * Marks one region visited or not, and answers with both scopes.
 *
 * The whole set rather than the one change, so a caller never has to hold a copy
 * it patched itself — and so the first write of a seeded document hands back what it
 * settled on. `seed` is {@link listVisits}'s, and matters on exactly one call:
 * the first write, which must not drop what the reader already had. `null` where
 * marking the region would pass {@link MAX_VISITS} in its scope.
 */
export async function setVisit(
	userId: string,
	scope: VisitScope,
	region: string,
	visited: boolean,
	seed?: () => Promise<Visits>,
): Promise<Visits | null> {
	return serialize(async () => {
		const held = await listVisits(userId, seed)

		const names = new Set(held[scope])

		if (visited && !names.has(region) && names.size >= MAX_VISITS) return null

		if (visited) names.add(region)
		else names.delete(region)

		const next: Visits = { ...held, [scope]: parseNames([...names]) }

		await writeDocument(userId, 'visits', next)

		return next
	})
}
