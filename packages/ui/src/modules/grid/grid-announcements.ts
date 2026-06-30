/**
 * Pure builders for the grid's polite a11y announcements (WCAG 4.1.3): the sort
 * and selection summaries {@link GridData} narrates through the shared live
 * region when they change. Kept pure and separate from the busy-status component
 * so the wording is unit-testable without rendering.
 */

import type { SortState } from './context'
import { columnLabel, type GridColumn } from './types'

/**
 * The polite announcement for the grid's current sort, narrated to assistive
 * tech when it changes (WCAG 4.1.3): `Sorting cleared` when unsorted, else the
 * sorted columns by display label and direction, in priority order (`Sorted by
 * Name ascending, then Age descending`). Resolves each label from the visible
 * columns so multi-column sort priority is spoken, not just shown.
 *
 * @internal
 */
export function describeSort<T>(sort: SortState[], columns: GridColumn<T>[]): string {
	if (sort.length === 0) return 'Sorting cleared'

	const parts = sort.map((entry) => {
		const column = columns.find((candidate) => candidate.id === entry.column)

		const name = column ? columnLabel(column) : String(entry.column)

		return `${name} ${entry.direction === 'asc' ? 'ascending' : 'descending'}`
	})

	return `Sorted by ${parts.join(', then ')}`
}

/**
 * The polite announcement for the row selection, narrated when it changes (WCAG
 * 4.1.3): `All rows selected` — or `All rows on this page selected` when
 * paginated, since the select-all is page-scoped and the label says as much —
 * `Selection cleared`, or the running count (`3 rows selected`). The caller
 * gates announcing on a selection column being present, so a non-selectable grid
 * stays silent.
 *
 * @internal
 */
export function describeSelection(size: number, allSelected: boolean, onPage: boolean): string {
	if (allSelected) return onPage ? 'All rows on this page selected' : 'All rows selected'

	if (size === 0) return 'Selection cleared'

	return `${size} ${size === 1 ? 'row' : 'rows'} selected`
}
