import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { parseRecipe } from '../schemas/recipe'
import type { Recipe, RecipeDraft } from '../types'
import { createQueue, readRecords, writeJsonFile } from './json-file'

/**
 * The store: every recipe, in one JSON file under the app.
 *
 * It is the one module that knows where recipes live, so a gateway or a database
 * can replace this file without the handlers, the queries, or the components
 * changing at all.
 *
 * Every write goes through {@link serialize}, which is what keeps two requests
 * landing together from each reading the same list and writing back over one
 * another.
 */

const FILE = join(process.cwd(), '.data', 'recipes.json')

const serialize = createQueue()

/** Writes the whole list, atomically. */
function writeAll(recipes: Recipe[]): Promise<void> {
	return writeJsonFile(FILE, recipes)
}

/**
 * Every stored recipe in the reader's own order, dropping any record that no
 * longer reads as one — a hand-edited file must not put a card with no name in
 * the list.
 *
 * The name breaks a tie, so two recipes that were never dragged apart still hold
 * a stable order between reads rather than trading places on each write.
 */
export async function listRecipes(): Promise<Recipe[]> {
	const recipes = await readRecords(FILE, parseRecipe)

	return recipes.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
}

/**
 * Appends one recipe, giving it its identity, its written-at stamp, and a place
 * at the end of the reader's order.
 */
export async function addRecipe(draft: RecipeDraft): Promise<Recipe> {
	return serialize(async () => {
		const recipes = await listRecipes()

		const last = recipes[recipes.length - 1]

		const recipe: Recipe = {
			...draft,
			id: randomUUID(),
			createdAt: new Date().toISOString(),
			order: last === undefined ? 0 : last.order + 1,
			favorite: false,
		}

		await writeAll([...recipes, recipe])

		return recipe
	})
}

/**
 * Replaces one recipe, keeping the identity, the written-at stamp, the order,
 * and the favourite mark it already had — those belong to the record, not to the
 * draft that edits it.
 *
 * `null` where no recipe carries that id, which the handler answers as a 404
 * rather than writing a new record under an id the caller invented.
 */
export async function updateRecipe(id: string, draft: RecipeDraft): Promise<Recipe | null> {
	return serialize(async () => {
		const recipes = await listRecipes()

		const held = recipes.find((recipe) => recipe.id === id)

		if (held === undefined) return null

		const updated: Recipe = {
			...draft,
			id: held.id,
			createdAt: held.createdAt,
			order: held.order,
			favorite: held.favorite,
		}

		await writeAll(recipes.map((recipe) => (recipe.id === id ? updated : recipe)))

		return updated
	})
}

/** Marks one recipe a favourite, or takes the mark off. `null` where none carried that id. */
export async function setFavorite(id: string, favorite: boolean): Promise<Recipe | null> {
	return serialize(async () => {
		const recipes = await listRecipes()

		const held = recipes.find((recipe) => recipe.id === id)

		if (held === undefined) return null

		const updated: Recipe = { ...held, favorite }

		await writeAll(recipes.map((recipe) => (recipe.id === id ? updated : recipe)))

		return updated
	})
}

/**
 * Writes the reader's order from a list of ids.
 *
 * Takes ids rather than records, because a drag moves positions and changes
 * nothing else: sending whole records back would let a stale card in the
 * browser overwrite an edit that landed between the read and the drop.
 *
 * An id the store does not hold is ignored, and a recipe the list leaves out
 * keeps its place after the ones named — so a reorder computed against a stale
 * list moves what it meant to and disturbs nothing else.
 */
export async function reorderRecipes(ids: readonly string[]): Promise<Recipe[]> {
	return serialize(async () => {
		const recipes = await listRecipes()

		const rank = new Map(ids.map((id, at) => [id, at]))

		const ordered = [...recipes].sort((a, b) => {
			const left = rank.get(a.id) ?? Number.POSITIVE_INFINITY

			const right = rank.get(b.id) ?? Number.POSITIVE_INFINITY

			return left - right || a.order - b.order || a.name.localeCompare(b.name)
		})

		const next = ordered.map((recipe, at) => ({ ...recipe, order: at }))

		await writeAll(next)

		return next
	})
}

/**
 * Removes one recipe. `false` where none carried that id, so a repeated delete
 * reports the same thing the first one did rather than a silent success.
 */
export async function removeRecipe(id: string): Promise<boolean> {
	return serialize(async () => {
		const recipes = await listRecipes()

		const kept = recipes.filter((recipe) => recipe.id !== id)

		if (kept.length === recipes.length) return false

		await writeAll(kept)

		return true
	})
}
