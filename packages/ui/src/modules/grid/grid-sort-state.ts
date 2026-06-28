'use client'

import { useCallback } from 'react'
import { useControllable } from '../../hooks'
import type { SortState } from './context'
import type { GridSort } from './grid-data-types'

/** Stable empty sort default; the unsorted state, read-only and replaced wholesale. @internal */
const EMPTY_SORT: SortState[] = []

/**
 * Next sort list after cycling `column`. A Shift-click (`additive`) folds the
 * column into the existing sort, preserving the others and their priority order:
 * appending it ascending, flipping it to descending, then dropping it. A plain
 * click collapses the sort to this column alone, cycling ascending → descending →
 * unsorted (so a lone sorted column clears on its third click).
 *
 * @internal
 */
export function nextSort(
	current: SortState[],
	column: string | number,
	additive: boolean,
): SortState[] {
	const existing = current.find((entry) => entry.column === column)

	if (additive) {
		if (!existing) return [...current, { column, direction: 'asc' }]

		if (existing.direction === 'asc') {
			return current.map((entry) =>
				entry.column === column ? { column, direction: 'desc' } : entry,
			)
		}

		return current.filter((entry) => entry.column !== column)
	}

	// Tri-state only when this column is already the sole sort; otherwise a plain
	// click on any other (or additional) column resets to just this one, ascending.
	if (current.length === 1 && existing) {
		return existing.direction === 'asc' ? [{ column, direction: 'desc' }] : EMPTY_SORT
	}

	return [{ column, direction: 'asc' }]
}

/**
 * Owns the grid's controllable sort: the resolved ordered list (never
 * `undefined` — an empty list is unsorted), the raw setter the engine and header
 * menu write through, and `toggleSort`, which cycles a column's sort via
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

	const toggleSort = useCallback(
		(column: string | number, additive: boolean) =>
			setSortState((prev) => nextSort(prev ?? EMPTY_SORT, column, additive)),
		[setSortState],
	)

	return { sort: sortState ?? EMPTY_SORT, setSort: setSortState, toggleSort }
}
