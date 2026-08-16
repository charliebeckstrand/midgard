import type { CookEvent, RankedRecipe, Recipe, RecipeSort } from '../types'
import { dayLabel } from './day'

/**
 * What the cook log says about each recipe, and the orders that reads out of it.
 *
 * Every number here is a fold rather than a field. A counter kept on the record
 * would have to be corrected by every write that touches a cook — an add, a
 * delete, a recipe removed — and the first one that forgot would leave a list
 * ordered by a number nothing in the app could explain.
 */

/** One recipe's two facts, before they are joined back onto the record. */
type CookFacts = {
	count: number
	/** The latest day, which is a `YYYY-MM-DD` and so compares as text. */
	last: string | null
}

const NO_COOKS: CookFacts = { count: 0, last: null }

/**
 * The log folded by recipe, in one pass.
 *
 * A map rather than a filter per recipe: the list joins every recipe against
 * this, so the per-recipe form is a walk of the whole log for each one — which
 * is the shape that stops being free at a few hundred of either.
 */
export function cookFacts(cooks: readonly CookEvent[]): Map<string, CookFacts> {
	const facts = new Map<string, CookFacts>()

	for (const cook of cooks) {
		const held = facts.get(cook.recipeId) ?? NO_COOKS

		facts.set(cook.recipeId, {
			count: held.count + 1,
			// Days are `YYYY-MM-DD`, so the later day is the greater string and no
			// date has to be built to find it.
			last: held.last === null || cook.day > held.last ? cook.day : held.last,
		})
	}

	return facts
}

/** Every recipe with what the log says about it, in the order it arrived. */
export function rankRecipes(
	recipes: readonly Recipe[],
	cooks: readonly CookEvent[],
): RankedRecipe[] {
	const facts = cookFacts(cooks)

	return recipes.map((recipe) => {
		const held = facts.get(recipe.id) ?? NO_COOKS

		return { ...recipe, cookCount: held.count, lastCookedAt: held.last }
	})
}

/**
 * Later days first, and a recipe never cooked last.
 *
 * Never-cooked sorts to the end rather than to the start under both orders that
 * read it, because "cooked longest ago" and "never cooked" are different answers
 * and only one of them is a date.
 */
function byLastCooked(a: RankedRecipe, b: RankedRecipe): number {
	if (a.lastCookedAt === b.lastCookedAt) return 0

	if (a.lastCookedAt === null) return 1

	if (b.lastCookedAt === null) return -1

	return b.lastCookedAt.localeCompare(a.lastCookedAt)
}

/**
 * The list in one of its orders.
 *
 * Every order ends on the name, so the result is total: two recipes that tie on
 * everything the order measures still hold a fixed position between reads, and
 * the list does not shuffle under a reader who changed nothing.
 *
 * `manual` is the reader's own, and the only one a drag can write to. See
 * `RecipeSort`.
 */
export function sortRecipes(recipes: readonly RankedRecipe[], sort: RecipeSort): RankedRecipe[] {
	const ordered = [...recipes]

	switch (sort) {
		case 'name':
			return ordered.sort((a, b) => a.name.localeCompare(b.name))

		case 'most-cooked':
			return ordered.sort(
				(a, b) => b.cookCount - a.cookCount || byLastCooked(a, b) || a.name.localeCompare(b.name),
			)

		case 'recently-cooked':
			return ordered.sort((a, b) => byLastCooked(a, b) || a.name.localeCompare(b.name))

		default:
			return ordered.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
	}
}

/** How a day reads in a summary, where the year matters and the weekday does not. */
const SHORT_DAY: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }

/**
 * What the log says about one recipe, as a line.
 *
 * Both the list and the palette want this sentence; the palette wants it without
 * the date, because a row in a picker is scanned rather than read.
 */
export function cookSummary(recipe: RankedRecipe, options: { withDate?: boolean } = {}): string {
	if (recipe.cookCount === 0) return 'Never cooked'

	const times = recipe.cookCount === 1 ? 'Cooked once' : `Cooked ${recipe.cookCount} times`

	if (options.withDate !== true || recipe.lastCookedAt === null) return times

	return `${times} · last on ${dayLabel(recipe.lastCookedAt, SHORT_DAY)}`
}
