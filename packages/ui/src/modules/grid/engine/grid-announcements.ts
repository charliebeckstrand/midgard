/**
 * Pure builders for the grid's polite a11y announcements (WCAG 4.1.3): the sort
 * and selection summaries {@link GridData} narrates through the shared live
 * region when they change. Kept pure and separate from the busy-status component
 * so the wording is unit-testable without rendering. Each builder takes the intl
 * of the reader and speaks in its language.
 */

import { defineMessages } from '../../../primitives/intl/intl-messages'
import type { IntlShape } from '../../../primitives/intl/types'
import type { GridColumn } from '../types'
import { columnLabel } from './grid-column/label'
import type { GridHistoryStep } from './grid-edit-history'
import { physicalSide } from './grid-pin/overrides'
import type { GridSortState } from './grid-sort/state'

const messages = defineMessages<{
	sortCleared: Record<never, never>
	sortEntry: { column: string; direction: 'asc' | 'desc' }
	sortThen: { first: string; next: string }
	sortedBy: { columns: string }
	allSelected: Record<never, never>
	allSelectedOnPage: Record<never, never>
	selectionCleared: Record<never, never>
	rowsSelected: { count: number }
	pinned: { column: string; side: 'left' | 'right' }
	unpinned: { column: string }
	hid: { column: string }
	showed: { column: string }
	resized: { column: string; width: number }
	cellOutcome: { column: string; outcome: GridCellOutcome }
	cellsOutcome: { count: number; outcome: GridCellOutcome }
	forRow: { cells: string; row: string }
	partial: { saved: string; failed: string }
	discarded: { count: number }
	nothingTo: { step: GridHistoryStep }
	blocked: { step: GridHistoryStep }
	stale: { step: GridHistoryStep }
	rowAdded: Record<never, never>
	rowRefused: { count: number }
	skippedOnly: { count: number }
	withSkipped: { saved: string; count: number }
	range: {
		rows: number
		cols: number
		fromColumn: string
		fromRow: number
		toColumn: string
		toRow: number
	}
}>({
	sortCleared: {
		id: 'ui.grid.sortCleared',
		defaultMessage: 'Sorting cleared',
		description: 'Spoken when the grid is no longer sorted.',
	},
	sortEntry: {
		id: 'ui.grid.sortEntry',
		defaultMessage: '{column} {direction, select, asc {ascending} other {descending}}',
		description: 'A sorted column and its direction, inside the sort announcement of the grid.',
	},
	sortThen: {
		id: 'ui.grid.sortThen',
		defaultMessage: '{first}, then {next}',
		description:
			'Joins the sorted columns of the grid in their order, such as "Name ascending, then Age descending".',
	},
	sortedBy: {
		id: 'ui.grid.sortedBy',
		defaultMessage: 'Sorted by {columns}',
		description:
			'Spoken when the sort of the grid changes. The columns are the sorted columns, in order.',
	},
	allSelected: {
		id: 'ui.grid.allSelected',
		defaultMessage: 'All rows selected',
		description: 'Spoken when the reader selects all the rows of the grid.',
	},
	allSelectedOnPage: {
		id: 'ui.grid.allSelectedOnPage',
		defaultMessage: 'All rows on this page selected',
		description: 'Spoken when the reader selects all the rows of the current page of the grid.',
	},
	selectionCleared: {
		id: 'ui.grid.selectionCleared',
		defaultMessage: 'Selection cleared',
		description: 'Spoken when no row of the grid is selected any more.',
	},
	rowsSelected: {
		id: 'ui.grid.rowsSelected',
		defaultMessage: '{count, plural, one {# row selected} other {# rows selected}}',
		description:
			'Spoken when the selection of the grid changes. The count is the number of selected rows.',
	},
	pinned: {
		id: 'ui.grid.pinned',
		defaultMessage: 'Pinned {column} to the {side, select, left {left} other {right}}',
		description: 'Spoken when the reader pins a column of the grid to an edge.',
	},
	unpinned: {
		id: 'ui.grid.unpinned',
		defaultMessage: 'Unpinned {column}',
		description: 'Spoken when the reader unpins a column of the grid.',
	},
	hid: {
		id: 'ui.grid.hid',
		defaultMessage: 'Hid {column} column',
		description: 'Spoken when the reader hides a column of the grid.',
	},
	showed: {
		id: 'ui.grid.showed',
		defaultMessage: 'Showed {column} column',
		description: 'Spoken when the reader shows a hidden column of the grid.',
	},
	resized: {
		id: 'ui.grid.resized',
		defaultMessage: '{column} column {width, plural, one {# pixel} other {# pixels}}',
		description: 'Spoken when the reader resizes a column of the grid. The width is in pixels.',
	},
	cellOutcome: {
		id: 'ui.grid.cellOutcome',
		defaultMessage:
			'{column} {outcome, select, updated {updated} undone {undone} redone {redone} pasted {pasted} filled {filled} other {not saved}}',
		description:
			'Spoken when an edit of one cell of the grid saves, undoes, redoes, pastes, fills, or fails. The column names the cell.',
	},
	cellsOutcome: {
		id: 'ui.grid.cellsOutcome',
		defaultMessage:
			'{count, plural, one {# cell} other {# cells}} {outcome, select, updated {updated} undone {undone} redone {redone} pasted {pasted} filled {filled} other {not saved}}',
		description:
			'Spoken when an edit of many cells of the grid saves, undoes, redoes, pastes, fills, or fails. The count is the number of cells.',
	},
	forRow: {
		id: 'ui.grid.forRow',
		defaultMessage: '{cells} for {row}',
		description:
			'Adds the row to a save announcement of the grid, such as "Name updated for Alice".',
	},
	partial: {
		id: 'ui.grid.partial',
		defaultMessage: '{saved}, {failed}',
		description:
			'Joins the saved and the failed cells of one save of the grid, such as "Name updated, 2 cells not saved".',
	},
	discarded: {
		id: 'ui.grid.discarded',
		defaultMessage: '{count, plural, one {# change discarded} other {# changes discarded}}',
		description:
			'Spoken when the grid drops edits that were not saved. The count is the number of edits.',
	},
	nothingTo: {
		id: 'ui.grid.nothingTo',
		defaultMessage: '{step, select, undo {Nothing to undo} other {Nothing to redo}}',
		description: 'Spoken when the reader asks the grid to undo or redo and there is nothing to do.',
	},
	blocked: {
		id: 'ui.grid.blocked',
		defaultMessage:
			'{step, select, undo {Cannot undo while a cell has an edit} other {Cannot redo while a cell has an edit}}',
		description: 'Spoken when the grid cannot undo or redo, because a cell has an open edit.',
	},
	stale: {
		id: 'ui.grid.stale',
		defaultMessage:
			'{step, select, undo {Cannot undo, the cells changed} other {Cannot redo, the cells changed}}',
		description:
			'Spoken when the grid cannot undo or redo, because the cells changed since the edit.',
	},
	rowAdded: {
		id: 'ui.grid.rowAdded',
		defaultMessage: 'Row added',
		description: 'Spoken when the reader adds a row to the grid.',
	},
	rowRefused: {
		id: 'ui.grid.rowRefused',
		defaultMessage:
			'{count, plural, one {Row not added, # cell refused} other {Row not added, # cells refused}}',
		description:
			'Spoken when the grid does not add a new row. The count is the number of refused cells.',
	},
	skippedOnly: {
		id: 'ui.grid.skippedOnly',
		defaultMessage: '{count, plural, one {# cell skipped} other {# cells skipped}}',
		description:
			'Spoken when a paste into the grid skips every cell. The count is the number of cells.',
	},
	withSkipped: {
		id: 'ui.grid.withSkipped',
		defaultMessage: '{saved}, {count, plural, other {# skipped}}',
		description:
			'Adds the skipped cells to a paste announcement of the grid, such as "12 cells pasted, 2 skipped".',
	},
	range: {
		id: 'ui.grid.range',
		defaultMessage:
			'Range of {rows, plural, one {# row} other {# rows}} and {cols, plural, one {# column} other {# columns}}, {fromColumn} row {fromRow} to {toColumn} row {toRow}',
		description:
			'Spoken when the reader selects a range of cells of the grid: its size, and its two corners by column and row number.',
	},
})

// What a save did to one or more cells, or that it failed.
type GridCellOutcome = GridSaveOutcome | 'notSaved'

/**
 * The polite announcement for the grid's current sort, narrated to assistive
 * tech when it changes (WCAG 4.1.3). It reads `Sorting cleared` when unsorted,
 * else the sorted columns by display label and direction, in priority order
 * (`Sorted by Name ascending, then Age descending`). Resolves each label from
 * `columns`, so multi-column sort priority is spoken, not just shown. Give it
 * every column: a sorted column that is hidden keeps its label.
 *
 * @internal
 */
export function describeSort<T>(
	intl: IntlShape,
	sort: GridSortState[],
	columns: GridColumn<T>[],
): string {
	if (sort.length === 0) return intl.formatMessage(messages.sortCleared)

	const parts = sort.map((entry) => {
		const column = columns.find((candidate) => candidate.id === entry.column)

		const name = column ? columnLabel(column) : String(entry.column)

		return intl.formatMessage(messages.sortEntry, { column: name, direction: entry.direction })
	})

	const joined = parts.reduce((first, next) =>
		intl.formatMessage(messages.sortThen, { first, next }),
	)

	return intl.formatMessage(messages.sortedBy, { columns: joined })
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
export function describeSelection(
	intl: IntlShape,
	size: number,
	allSelected: boolean,
	onPage: boolean,
): string {
	if (allSelected) {
		return intl.formatMessage(onPage ? messages.allSelectedOnPage : messages.allSelected)
	}

	if (size === 0) return intl.formatMessage(messages.selectionCleared)

	return intl.formatMessage(messages.rowsSelected, { count: size })
}

/**
 * The polite announcement for a column pin change, narrated when the header menu
 * or pin button moves a column (WCAG 4.1.3). It reads `Pinned Name to the left`,
 * `Pinned Name to the right`, or `Unpinned Name` when released. The side is
 * logical, and the words name the physical edge (see {@link physicalSide}).
 *
 * @param rtl - Whether the grid lays out right to left.
 * @internal
 */
export function describePin(
	intl: IntlShape,
	label: string,
	side: 'left' | 'right' | false,
	rtl = false,
): string {
	return side === false
		? intl.formatMessage(messages.unpinned, { column: label })
		: intl.formatMessage(messages.pinned, { column: label, side: physicalSide(side, rtl) })
}

/**
 * The polite announcement for a column show/hide from the column manager (WCAG
 * 4.1.3): `Hid Name column` or `Showed Name column`.
 *
 * @internal
 */
export function describeColumnVisibility(intl: IntlShape, label: string, hidden: boolean): string {
	return intl.formatMessage(hidden ? messages.hid : messages.showed, { column: label })
}

/**
 * The polite announcement for a settled column resize, narrated on commit (a
 * keyboard resize debounces so a run of nudges doesn't chatter; WCAG 4.1.3):
 * `Name column 240 pixels`.
 *
 * @internal
 */
export function describeResize(intl: IntlShape, label: string, width: number): string {
	return intl.formatMessage(messages.resized, { column: label, width: Math.round(width) })
}

/**
 * The subject of a save announcement: one cell by its column label, else a
 * count of cells, then the outcome (`Name updated`, `2 cells not saved`).
 */
function describeCells(
	intl: IntlShape,
	columns: readonly string[],
	outcome: GridCellOutcome,
): string {
	const [column] = columns

	return columns.length === 1 && column !== undefined
		? intl.formatMessage(messages.cellOutcome, { column, outcome })
		: intl.formatMessage(messages.cellsOutcome, { count: columns.length, outcome })
}

/** Adds the row to a save announcement, when one row holds every cell. */
function forRow(intl: IntlShape, cells: string, row: string | undefined): string {
	return row === undefined ? cells : intl.formatMessage(messages.forRow, { cells, row })
}

/**
 * What a save did to its cells: a save updates them, an undo undoes them, a
 * redo redoes them, a paste pastes them, and a fill fills them. @internal
 */
export type GridSaveOutcome = 'updated' | 'undone' | 'redone' | 'pasted' | 'filled'

/**
 * The polite announcement for an inline-edit commit, narrated when staged cells
 * reach the sink (WCAG 4.1.3). Under cell scope it speaks after focus has moved
 * to the next editor, so it names what saved. One cell reads by its column,
 * and more cells read as a count. The row is named when one row holds every
 * cell: `Name updated for Alice`, `3 cells updated for Alice`, or `5 cells
 * updated` across rows. An undo and a redo read the same way, with their own
 * outcome (`Name undone for Alice`). The caller gates on at least one cell, so
 * a session that changed nothing stays silent.
 *
 * @param columns - The column label of each saved cell.
 * @param row - The label of the one row that holds every cell.
 * @param outcome - What the save did.
 * @internal
 */
export function describeCommit(
	intl: IntlShape,
	columns: readonly string[],
	row?: string,
	outcome: GridSaveOutcome = 'updated',
): string {
	return forRow(intl, describeCells(intl, columns, outcome), row)
}

/**
 * The polite announcement for refused edits that the grid drops (WCAG 4.1.3):
 * `1 change discarded`. That happens when the consumer declines to open the
 * row of a refused edit again, closes it, or deletes it. The caller gates on
 * a non-zero count.
 *
 * @internal
 */
export function describeDiscard(intl: IntlShape, changes: number): string {
	return intl.formatMessage(messages.discarded, { count: changes })
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
 * @param outcome - What the batch did to the accepted cells.
 * @internal
 */
export function describeSettle(
	intl: IntlShape,
	saved: readonly string[],
	refused: readonly string[],
	row?: string,
	outcome: GridSaveOutcome = 'updated',
): string {
	if (refused.length === 0) return describeCommit(intl, saved, row, outcome)

	const failed = describeCells(intl, refused, 'notSaved')

	const parts =
		saved.length === 0
			? failed
			: intl.formatMessage(messages.partial, {
					saved: describeCells(intl, saved, outcome),
					failed,
				})

	return forRow(intl, parts, row)
}

/**
 * The polite announcement for an undo or a redo that writes nothing (WCAG
 * 4.1.3). `'empty'` reads `Nothing to undo`. `'blocked'` reads `Cannot undo
 * while a cell has an edit`, because a draft of the entry's cells is open.
 * `'stale'` reads `Cannot undo, the cells changed`, because each cell of the
 * entry holds a new value since the save.
 *
 * @internal
 */
export function describeHistoryMiss(
	intl: IntlShape,
	step: GridHistoryStep,
	status: 'empty' | 'blocked' | 'stale',
): string {
	const message = { empty: messages.nothingTo, blocked: messages.blocked, stale: messages.stale }[
		status
	]

	return intl.formatMessage(message, { step })
}

/**
 * The polite announcement for an add from the new-row slot (WCAG 4.1.3). An
 * accepted add reads `Row added`. A refused add counts the refused cells
 * (`Row not added, 1 cell refused`), whether `validate` or the consumer
 * refused them.
 *
 * @internal
 */
export function describeRowAdd(intl: IntlShape, refused: number): string {
	if (refused === 0) return intl.formatMessage(messages.rowAdded)

	return intl.formatMessage(messages.rowRefused, { count: refused })
}

/**
 * The polite announcement for a write of many cells at once, such as a paste
 * (WCAG 4.1.3). It reads as {@link describeCommit}, and adds the count of the
 * cells that the write skipped: `12 cells pasted, 2 skipped`. With no saved
 * cell, it gives the skipped count alone (`2 cells skipped`). With nothing to
 * say, it returns `null`. @internal
 */
export function describeWrite(
	intl: IntlShape,
	columns: readonly string[],
	row: string | undefined,
	outcome: GridSaveOutcome,
	skipped: number,
): string | null {
	if (columns.length === 0) {
		return skipped > 0 ? intl.formatMessage(messages.skippedOnly, { count: skipped }) : null
	}

	const saved = describeCommit(intl, columns, row, outcome)

	return skipped > 0 ? intl.formatMessage(messages.withSkipped, { saved, count: skipped }) : saved
}

/**
 * The polite announcement for a cell range (WCAG 4.1.3). It gives the size
 * of the range and its two corners, the anchor first:
 * `Range of 3 rows and 2 columns, Name row 2 to Status row 4`.
 *
 * @param size - The count of data rows and of columns in the range.
 * @param from - The column label and the row number of the anchor.
 * @param to - The column label and the row number of the cursor.
 * @internal
 */
export function describeRange(
	intl: IntlShape,
	size: { rows: number; cols: number },
	from: { column: string; row: number },
	to: { column: string; row: number },
): string {
	return intl.formatMessage(messages.range, {
		rows: size.rows,
		cols: size.cols,
		fromColumn: from.column,
		fromRow: from.row,
		toColumn: to.column,
		toRow: to.row,
	})
}
