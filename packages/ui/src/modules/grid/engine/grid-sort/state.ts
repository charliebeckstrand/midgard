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

/**
 * A column's place in the priority-ordered sort: whether it sorts, its
 * direction, and its 1-based priority — surfaced only under a multi-column sort,
 * where the ranking is meaningful (a single sort needs no badge).
 *
 * @internal
 */
export function columnSort(
	sort: SortState[],
	columnId: string | number,
): { sorted: boolean; direction: 'asc' | 'desc' | undefined; priority: number | undefined } {
	const index = sort.findIndex((entry) => entry.column === columnId)

	if (index === -1) return { sorted: false, direction: undefined, priority: undefined }

	return {
		sorted: true,
		direction: sort[index]?.direction,
		priority: sort.length > 1 ? index + 1 : undefined,
	}
}

/**
 * `aria-sort` for a column: the active direction, `'none'` when sortable but not
 * the sort column, and `undefined` when not sortable.
 *
 * @internal
 */
export function ariaSortValue(
	sortable: boolean | undefined,
	sorted: boolean,
	direction: 'asc' | 'desc' | undefined,
): 'ascending' | 'descending' | 'none' | undefined {
	if (!sortable) return undefined

	if (!sorted) return 'none'

	return direction === 'asc' ? 'ascending' : 'descending'
}
