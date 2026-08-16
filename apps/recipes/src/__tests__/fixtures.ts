import type { CookEvent, PlanEntry, Recipe } from '../types'

/**
 * One stored recipe, with only the fields a case is about named at its call
 * site.
 *
 * Shared because the defaults are the thing that drifts. Written out per file,
 * the same fixture carries a different `servings` and a different `order` in
 * each, so a test that reads a field it had not named gets a different answer
 * depending on which file it lives in — and a field added to {@link Recipe}
 * breaks every copy separately.
 */
export function recipe(id: string, fields: Partial<Recipe> = {}): Recipe {
	return {
		id,
		name: id,
		servings: 4,
		ingredients: [{ quantity: 1, unit: 'kg', item: 'potatoes' }],
		steps: ['Cook it.'],
		labels: [],
		favorite: false,
		order: 0,
		createdAt: '2026-08-15T18:00:00.000Z',
		...fields,
	}
}

/** One cook of a recipe on a day, which is all the log holds. */
export function cook(id: string, recipeId: string, day: string): CookEvent {
	return { id, recipeId, day, createdAt: `${day}T18:00:00.000Z` }
}

/** One planned meal. */
export function planned(id: string, day: string, recipeId: string, position = 0): PlanEntry {
	return { id, day, recipeId, position }
}
