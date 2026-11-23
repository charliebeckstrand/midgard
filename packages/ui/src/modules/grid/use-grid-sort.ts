'use client'

import { useCallback } from 'react'
import { useControllableBinding } from '../../hooks/use-controllable'
import type { GridSortState } from './context'
import { EMPTY_SORT, nextSort } from './engine/grid-sort/state'
import type { GridSort } from './grid-data-types'

/**
 * Owns the grid's controllable sort. The resolved list is ordered and never
 * `undefined`: an empty list is unsorted. The raw setter is what the engine and
 * header menu write through. `toggleSort` cycles a column's sort via
 * {@link nextSort} (Shift-click folds it into the existing sort).
 *
 * @internal
 */
export function useGridSort(config: GridSort | undefined): {
	sort: GridSortState[]
	setSort: (sort: GridSortState[]) => void
	toggleSort: (column: string | number, additive: boolean) => void
} {
	// The empty list is the unsorted state.
	const [sort, setSort] = useControllableBinding(config, EMPTY_SORT)

	const cycle = config?.cycle

	const toggleSort = useCallback(
		(column: string | number, additive: boolean) =>
			setSort((prev) => nextSort(prev, column, additive, cycle)),
		[setSort, cycle],
	)

	return { sort, setSort, toggleSort }
}
