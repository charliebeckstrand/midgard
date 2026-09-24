/**
 * Pure builders for the grid's polite a11y announcements (WCAG 4.1.3): the sort
 * and selection summaries {@link GridData} narrates through the shared live
 * region when they change. Kept pure and separate from the busy-status component
 * so the wording is unit-testable without rendering.
 */

import type { GridSortState } from '../context'
import type { GridColumn } from '../types'
import { columnLabel } from './grid-column/label'

/**
 * The polite announcement for the grid's current sort, narrated to assistive
 * tech when it changes (WCAG 4.1.3). It reads `Sorting cleared` when unsorted,
 * else the sorted columns by display label and direction, in priority order
 * (`Sorted by Name ascending, then Age descending`). Resolves each label from the visible
 * columns so multi-column sort priority is spoken, not just shown.
 *
 * @internal
 */
export function describeSort<T>(sort: GridSortState[], columns: GridColumn<T>[]): string {
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
 * 4.1.3). It reads one of:
 *
 * - `All rows selected`, or `All rows on this page selected` when paginated,
 *   since the select-all is page-scoped and the label says as much;
 * - `Selection cleared`;
 * - the running count (`3 rows selected`).
 *
 * The caller gates announcing on a selection column being present, so a
 * non-selectable grid stays silent.
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
 * or pin button moves a column (WCAG 4.1.3). It reads `Pinned Name to the left`,
 * `Pinned Name to the right`, or `Unpinned Name` when released.
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

/**
 * The subject of a save announcement: one cell by its column label, else a
 * count of cells, then the outcome (`Name updated`, `2 cells not saved`).
 */
function describeCells(columns: readonly string[], outcome: string): string {
	return columns.length === 1 ? `${columns[0]} ${outcome}` : `${columns.length} cells ${outcome}`
}

/** The row part of a save announcement, when one row holds every cell. */
function forRow(row: string | undefined): string {
	return row === undefined ? '' : ` for ${row}`
}

/**
 * The polite announcement for an inline-edit commit, narrated when staged cells
 * reach the sink (WCAG 4.1.3). Under cell scope it speaks after focus has moved
 * to the next editor, so it names what saved. One cell reads by its column,
 * and more cells read as a count. The row is named when one row holds every
 * cell: `Name updated for Alice`, `3 cells updated for Alice`, or `5 cells
 * updated` across rows. The caller gates on at least one cell, so a session
 * that changed nothing stays silent.
 *
 * @param columns - The column label of each saved cell.
 * @param row - The label of the one row that holds every cell.
 * @internal
 */
export function describeCommit(columns: readonly string[], row?: string): string {
	return `${describeCells(columns, 'updated')}${forRow(row)}`
}

/**
 * The polite announcement for refused edits that the grid drops (WCAG 4.1.3):
 * `1 change discarded`. That happens when the consumer declines to open the
 * row of a refused edit again, closes it, or deletes it. The caller gates on
 * a non-zero count.
 *
 * @internal
 */
export function describeDiscard(changes: number): string {
	return `${changes} ${changes === 1 ? 'change' : 'changes'} discarded`
}

/**
 * The polite announcement for an async inline-edit commit as it settles (WCAG
 * 4.1.3). A batch holds one row. An accepted batch reads as
 * {@link describeCommit} does (`Name updated for Alice`). A refused batch names
 * the refused cells the same way (`Name not saved for Alice`). A partial
 * acceptance speaks both parts in one message (`Name updated, 2 cells not
 * saved for Alice`). The caller announces once for each batch.
 *
 * @param saved - The column label of each accepted cell.
 * @param refused - The column label of each refused cell.
 * @param row - The label of the row of the batch.
 * @internal
 */
export function describeSettle(
	saved: readonly string[],
	refused: readonly string[],
	row?: string,
): string {
	if (refused.length === 0) return describeCommit(saved, row)

	const failed = describeCells(refused, 'not saved')

	const parts = saved.length === 0 ? failed : `${describeCells(saved, 'updated')}, ${failed}`

	return `${parts}${forRow(row)}`
}

/**
 * The polite announcement for an add from the new-row slot (WCAG 4.1.3). An
 * accepted add reads `Row added`. A refused add counts the refused cells
 * (`Row not added, 1 cell refused`), whether `validate` or the consumer
 * refused them.
 *
 * @internal
 */
export function describeRowAdd(refused: number): string {
	if (refused === 0) return 'Row added'

	return `Row not added, ${refused} ${refused === 1 ? 'cell' : 'cells'} refused`
}
