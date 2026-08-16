import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { parseCookEvent } from '../schemas/recipe'
import type { CookDraft, CookEvent } from '../types'
import { createQueue, readJsonFile, writeJsonFile } from './json-file'

/**
 * The cook log: every meal actually cooked, in one JSON file under the app.
 *
 * Its own store rather than a field on the recipe, because it is a different
 * kind of thing. A recipe is a record the reader edits; a cook is an event that
 * happened, and events accumulate. Everything the list and the palette say about
 * how often something is cooked is a fold over this file — see `recipe-rank.ts`
 * — so nothing here counts anything.
 */

const FILE = join(process.cwd(), '.data', 'cooks.json')

const serialize = createQueue()

/** Reads the file, or an empty log where it does not exist yet. */
async function readAll(): Promise<unknown[]> {
	const parsed = await readJsonFile(FILE)

	return Array.isArray(parsed) ? parsed : []
}

/** Writes the whole log, atomically. */
function writeAll(cooks: CookEvent[]): Promise<void> {
	return writeJsonFile(FILE, cooks)
}

/**
 * Every cook, newest day first, dropping any record that no longer reads as one.
 *
 * The whole log rather than a window of it: the counts the list sorts by are
 * over all of time, and a log the reader could fill in one lifetime is smaller
 * than the atlas the map app fetches on every load.
 */
export async function listCooks(): Promise<CookEvent[]> {
	const stored = await readAll()

	const cooks: CookEvent[] = []

	for (const record of stored) {
		const parsed = parseCookEvent(record)

		if (parsed.ok) cooks.push(parsed.value)
	}

	return cooks.sort((a, b) => b.day.localeCompare(a.day))
}

/**
 * Records one cook.
 *
 * The same recipe on the same day twice is two cooks and not one, because it can
 * be: a batch cooked at noon and eaten again at seven is one cook, but the
 * reader is the one who knows that, and a store that silently merged them would
 * take a count away from them with no way to put it back.
 */
export async function addCook(draft: CookDraft): Promise<CookEvent> {
	return serialize(async () => {
		const cooks = await listCooks()

		const cook: CookEvent = {
			...draft,
			id: randomUUID(),
			createdAt: new Date().toISOString(),
		}

		await writeAll([cook, ...cooks])

		return cook
	})
}

/** Takes one cook back off the log. `false` where none carried that id. */
export async function removeCook(id: string): Promise<boolean> {
	return serialize(async () => {
		const cooks = await listCooks()

		const kept = cooks.filter((cook) => cook.id !== id)

		if (kept.length === cooks.length) return false

		await writeAll(kept)

		return true
	})
}

/**
 * Drops every cook of one recipe, for when the recipe itself goes.
 *
 * The log holds no history of what a deleted recipe was called, so an event
 * pointing at nothing is not a record — it is a row the calendar would draw as a
 * blank. The route that deletes a recipe calls this; the store does not reach
 * across to another file on its own.
 */
export async function removeCooksForRecipe(recipeId: string): Promise<number> {
	return serialize(async () => {
		const cooks = await listCooks()

		const kept = cooks.filter((cook) => cook.recipeId !== recipeId)

		const dropped = cooks.length - kept.length

		if (dropped > 0) await writeAll(kept)

		return dropped
	})
}
