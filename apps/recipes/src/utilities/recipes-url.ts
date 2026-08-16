import { isLabel } from '../schemas/recipe'
import type { RecipeSort } from '../types'
import type { RecipeFilterValue } from './recipes-filter'

/**
 * The reader's place in the app, as the address bar carries it.
 *
 * Everything here is a location and not a preference: what the list is narrowed
 * to, what order it is in, which week the board is showing, and which day is
 * open. Held in React state alone these were lost on reload and impossible to
 * send to anyone, while every breadcrumb rendered as a link that went nowhere.
 *
 * The keys are short and readable, because a reader sees them:
 *
 * - `q` — the search text.
 * - `label` — repeated, one per picked label.
 * - `fav` — favourites only, present or absent.
 * - `sort` — the list order, absent for the reader's own.
 * - `week` — the Monday of the week the board shows.
 * - `month` — `YYYY-MM`, the month the calendar shows.
 * - `day` — the open day.
 */
export type RecipesLocation = {
	filter: RecipeFilterValue
	sort: RecipeSort
}

/** The order an address that says nothing is in, which is the reader's own. */
const DEFAULT_SORT: RecipeSort = 'manual'

/** Every order that can be written down, so a hand-typed one is checked rather than trusted. */
const SORTS: readonly RecipeSort[] = ['manual', 'name', 'most-cooked', 'recently-cooked']

/** A trimmed value, or `undefined` where the key was absent or empty. */
function text(params: URLSearchParams, key: string): string | undefined {
	const value = params.get(key)?.trim()

	return value === undefined || value === '' ? undefined : value
}

/** Every value under one key, trimmed, dropping the empty ones. */
function list(params: URLSearchParams, key: string): string[] {
	return params
		.getAll(key)
		.map((value) => value.trim())
		.filter((value) => value !== '')
}

/** What the list is narrowed to. */
export function readFilter(params: URLSearchParams): RecipeFilterValue {
	const labels = list(params, 'label').filter(isLabel)

	const search = text(params, 'q')

	return {
		...(search === undefined ? {} : { search }),
		...(labels.length > 0 ? { labels } : {}),
		...(params.has('fav') ? { favorite: true as const } : {}),
	}
}

/** What order the list is in. An order the app does not have falls back rather than throwing. */
export function readSort(params: URLSearchParams): RecipeSort {
	const sort = text(params, 'sort')

	return SORTS.find((known) => known === sort) ?? DEFAULT_SORT
}

/**
 * Reads an address as a location.
 *
 * Every field is read defensively, because the address bar is an edge like any
 * other: a reader can type into it, and a link can outlive the app that wrote
 * it. A field that no longer parses is dropped rather than thrown over, so a
 * stale link opens the app it can rather than an error.
 */
export function readLocation(params: URLSearchParams): RecipesLocation {
	return { filter: readFilter(params), sort: readSort(params) }
}

/**
 * Writes a location as an address, in the key order above.
 *
 * A field the location does not hold is left out entirely, so the address stays
 * as short as what the reader has actually done — and the reader's own order
 * writes no `sort` at all, because it is what an unwritten address already
 * means.
 */
export function writeLocation({ filter, sort }: RecipesLocation): URLSearchParams {
	const params = new URLSearchParams()

	if (filter.search !== undefined && filter.search.trim() !== '') {
		params.set('q', filter.search.trim())
	}

	for (const label of filter.labels ?? []) params.append('label', label)

	// Present or absent, with no value: the key is the whole of what it says, and
	// `fav=1` would invite a reader to try `fav=0` and be ignored.
	if (filter.favorite === true) params.set('fav', '')

	if (sort !== DEFAULT_SORT) params.set('sort', sort)

	return params
}
