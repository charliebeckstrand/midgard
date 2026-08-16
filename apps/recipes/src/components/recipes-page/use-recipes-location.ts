'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import type { RecipeSort } from '../../types'
import type { RecipeFilterValue } from '../../utilities/recipes-filter'
import {
	type RecipesLocation,
	readFilter,
	readSort,
	writeLocation,
} from '../../utilities/recipes-url'

/** What {@link useRecipesLocation} hands back: where the reader is, and the ways to move them. */
export type RecipesLocationHandle = RecipesLocation & {
	setFilter: (filter: RecipeFilterValue) => void
	setSort: (sort: RecipeSort) => void
}

/**
 * One slice of the address, held by what it says rather than by the object it
 * was read from.
 *
 * `useSearchParams` hands back a new object on every write, so a location read
 * whole gives every slice a new identity whenever any one of them moves.
 * Downstream that is not free: the filter is a memo key for the filtered list,
 * so changing the order used to re-filter a list that had not changed.
 *
 * Keyed on what the reader answered and not on the fields it read, so nothing
 * outside the codec has to know which fields those are — and two addresses that
 * parse alike hold one value between them.
 */
function useSlice<T>(params: URLSearchParams, read: (params: URLSearchParams) => T): T {
	const value = read(params)

	const key = JSON.stringify(value)

	// The key is the whole of what the value says, so the memo holds until the
	// address says something else — which the rule cannot see.
	// biome-ignore lint/correctness/useExhaustiveDependencies: `key` is what `value` amounts to
	return useMemo(() => value, [key])
}

/**
 * The reader's place in the list, held in the address bar rather than in state.
 *
 * Neither write earns a history entry. A reader picking through labels would
 * otherwise have to press Back once per pick to leave the page they arrived on,
 * and an order is a way of looking at one list rather than a place they went.
 * Both are still in the address, so a reload keeps them and a link carries them.
 */
export function useRecipesLocation(): RecipesLocationHandle {
	const params = useSearchParams()

	const router = useRouter()

	const pathname = usePathname()

	const filter = useSlice(params, readFilter)

	const sort = useSlice(params, readSort)

	const location = useMemo<RecipesLocation>(() => ({ filter, sort }), [filter, sort])

	// Takes the part that moves and composes it over the part that does not, so
	// each setter below states its own change and nothing else.
	const write = useCallback(
		(next: Partial<RecipesLocation>) => {
			const query = writeLocation({ ...location, ...next }).toString()

			router.replace(query === '' ? pathname : `${pathname}?${query}`, { scroll: false })
		},
		[location, router, pathname],
	)

	const setFilter = useCallback((filter: RecipeFilterValue) => write({ filter }), [write])

	const setSort = useCallback((sort: RecipeSort) => write({ sort }), [write])

	return { filter, sort, setFilter, setSort }
}
