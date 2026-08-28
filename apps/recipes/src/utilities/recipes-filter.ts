import type { RankedRecipe, RecipeLabel } from '../types'

/** What the filter bar holds. An absent field narrows nothing, which is what an empty bar does. */
export type RecipeFilterValue = {
	/** Free text, matched against the name, the description, and the ingredient list. */
	search?: string
	labels?: RecipeLabel[]
	/**
	 * Favourites only.
	 *
	 * `true` or absent rather than a boolean, because the bar has two states and
	 * not three: a `false` would be a third way of saying what an absent field
	 * already says, and it would raise the Clear over a bar that narrows nothing.
	 */
	favorite?: true
}

/**
 * Whether the bar narrows anything.
 *
 * It reads the values rather than the keys: `Filters` leaves a cleared slot
 * present and `undefined`, so `Object.keys` counts a field the reader has
 * already emptied. Reading them generically rather than naming each one is what
 * keeps a filter added later from silently failing to raise the Clear.
 */
export function hasActiveFilter(filter: RecipeFilterValue): boolean {
	return Object.values(filter).some(
		(field) =>
			field !== undefined &&
			!(Array.isArray(field) && field.length === 0) &&
			!(typeof field === 'string' && field.trim() === ''),
	)
}

/**
 * Everything one recipe can be searched by, folded to one lower-cased line.
 *
 * The ingredients are in it because that is the search a cook actually runs:
 * they have a bag of lentils, not a dish in mind. The steps are not — the method
 * names every pan and every minute, so a search for "rice" would match anything
 * cooked beside it.
 */
function haystack(recipe: RankedRecipe): string {
	return [recipe.name, recipe.description ?? '', ...recipe.ingredients.map((line) => line.item)]
		.join('\n')
		.toLowerCase()
}

/**
 * The recipes a filter admits, in the order they were given.
 *
 * Each field narrows on its own and an absent one narrows nothing, so an empty
 * bar answers with everything. An empty label list is the reader having turned
 * every label off, which admits nothing — distinct from the absent field, which
 * admits all.
 *
 * A recipe matches the labels it holds *any* of rather than all: the labels are
 * facets of one dish and not a path through a tree, so a reader picking "quick"
 * and "vegetarian" is asking for either, and asking for both would usually
 * answer with nothing.
 */
export function filterRecipes(
	recipes: readonly RankedRecipe[],
	filter: RecipeFilterValue,
): RankedRecipe[] {
	const search = filter.search?.trim().toLowerCase() ?? ''

	return recipes.filter((recipe) => {
		if (filter.favorite === true && !recipe.favorite) return false

		if (filter.labels !== undefined) {
			if (!filter.labels.some((label) => recipe.labels.includes(label))) return false
		}

		if (search !== '' && !haystack(recipe).includes(search)) return false

		return true
	})
}
