import type { SortState } from '../../context'

/** Stable empty sort list; the unsorted state, read-only and replaced wholesale. @internal */
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
