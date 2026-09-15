'use client'

import { useCallback } from 'react'
import { useControllable } from '../../hooks'
import type { SortState } from './context'
import { nextSort } from './engine/grid-sort/state'
import type { GridSort } from './grid-data-types'

/** Stable empty sort default; the unsorted state, read-only and replaced wholesale. @internal */
const EMPTY_SORT: SortState[] = []

/**
 * Owns the grid's controllable sort. The resolved list is ordered and never
 * `undefined` — an empty list is unsorted. The raw setter is what the engine and
 * header menu write through. `toggleSort` cycles a column's sort via
 * {@link nextSort} (Shift-click folds it into the existing sort).
 *
 * @internal
 */
export function useGridSort(config: GridSort | undefined): {
	sort: SortState[]
	setSort: (sort: SortState[]) => void
	toggleSort: (column: string | number, additive: boolean) => void
} {
	const [sortState, setSortState] = useControllable<SortState[]>({
		value: config?.value,
		defaultValue: config?.defaultValue ?? EMPTY_SORT,
		// The list is never meaningfully `undefined`; coalesce so the public callback
		// keeps its non-nullable shape (an empty list is the unsorted state).
		onValueChange: (next) => config?.onValueChange?.(next ?? EMPTY_SORT),
	})

	const cycle = config?.cycle

	const toggleSort = useCallback(
		(column: string | number, additive: boolean) =>
			setSortState((prev) => nextSort(prev ?? EMPTY_SORT, column, additive, cycle)),
		[setSortState, cycle],
	)

	return { sort: sortState ?? EMPTY_SORT, setSort: setSortState, toggleSort }
}
