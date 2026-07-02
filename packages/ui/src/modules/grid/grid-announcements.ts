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

/**
 * The polite announcement for a committed row drag-reorder, narrated when a row
 * is dropped in a new position (WCAG 4.1.3): `Moved row to position 3 of 8`. The
 * position is 1-based; the caller supplies the row's new index and the total.
 *
 * @internal
 */
export function describeRowReorder(name: string, position: number, total: number): string {
	return `Moved ${name} to position ${position} of ${total}`
}

/**
 * The polite announcement for a column pin change, narrated when the header menu
 * or pin button moves a column (WCAG 4.1.3): `Pinned Name to the left`, `Pinned
 * Name to the right`, or `Unpinned Name` when released.
 *
 * @internal
 */
export function describePin(label: string, side: 'left' | 'right' | false): string {
	return side === false ? `Unpinned ${label}` : `Pinned ${label} to the ${side}`
}

/**
 * The polite announcement for a column show/hide from the column manager (WCAG
 * 4.1.3): `Hid Name column` or `Showed Name column`.
 *
 * @internal
 */
export function describeColumnVisibility(label: string, hidden: boolean): string {
	return hidden ? `Hid ${label} column` : `Showed ${label} column`
}

/**
 * The polite announcement for a settled column resize, narrated on commit (a
 * keyboard resize debounces so a run of nudges doesn't chatter; WCAG 4.1.3):
 * `Name column 240 pixels`.
 *
 * @internal
 */
export function describeResize(label: string, width: number): string {
	return `${label} column ${Math.round(width)} pixels`
}
