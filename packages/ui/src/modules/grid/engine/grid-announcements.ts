/**
 * Pure builders for the grid's polite a11y announcements (WCAG 4.1.3): the sort
 * and selection summaries {@link GridData} narrates through the shared live
 * region when they change. Kept pure and separate from the busy-status component
 * so the wording is unit-testable without rendering. Each builder takes the intl
 * of the reader and speaks in its language.
 */

import { defineMessages } from '../../../primitives/intl/intl-messages'
import type { IntlShape } from '../../../primitives/intl/types'
import type { Aggregation } from '../../../utilities/aggregate'
import type { GridColumn } from '../types'
import { formatAggregate } from './grid-aggregate'
import { columnLabel } from './grid-column/label'
import type { GridHistoryStep } from './grid-edit/history'
import { type PinSide, physicalSide } from './grid-pin/overrides'
import type { GridRangeFigure } from './grid-range/figures'
import type { GridSortState } from './grid-sort/state'

const messages = defineMessages<{
	sortCleared: Record<never, never>
	sortEntry: { column: string; direction: GridSortState['direction'] }
	sortThen: { first: string; next: string }
	sortedBy: { columns: string }
	allSelected: Record<never, never>
	allSelectedOnPage: Record<never, never>
	selectionCleared: Record<never, never>
	rowsSelected: { count: number }
	pinned: { column: string; side: PinSide }
	unpinned: { column: string }
	hid: { column: string }
	showed: { column: string }
	resized: { column: string; width: number }
	cellOutcome: { column: string; outcome: GridCellOutcome }
	cellsOutcome: { count: number; outcome: GridCellOutcome }
	forRow: { cells: string; row: string }
	partial: { saved: string; failed: string }
	discarded: { count: number }
	held: { column: string; error: string }
	nothingTo: { step: GridHistoryStep }
	blocked: { step: GridHistoryStep }
	stale: { step: GridHistoryStep }
	rowAdded: Record<never, never>
	rowRefused: { count: number }
	rowsPasted: { added: number; refused: number; rest: number; skipped: number }
	rowsHeld: { count: number }
	pasteWithRows: { cells: string; rows: string }
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
	rangeFigure: { op: Aggregation; value: string }
	rangeWithFigures: { range: string; figures: string }
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
			'{column} {outcome, select, updated {updated} undone {undone} redone {redone} pasted {pasted} filled {filled} cleared {cleared} cut {cut} other {not saved}}',
		description:
			'Spoken when an edit of one cell of the grid saves, undoes, redoes, pastes, fills, clears, cuts, or fails. The column names the cell.',
	},
	cellsOutcome: {
		id: 'ui.grid.cellsOutcome',
		defaultMessage:
			'{count, plural, one {# cell} other {# cells}} {outcome, select, updated {updated} undone {undone} redone {redone} pasted {pasted} filled {filled} cleared {cleared} cut {cut} other {not saved}}',
		description:
			'Spoken when an edit of many cells of the grid saves, undoes, redoes, pastes, fills, clears, cuts, or fails. The count is the number of cells.',
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
	held: {
		id: 'ui.grid.held',
		defaultMessage: '{column}: {error}',
		description:
			'Spoken when the reader tries to save an edit of the grid that the column refuses. The edit stays open. The error is the message of the column.',
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
	rowsPasted: {
		id: 'ui.grid.rowsPasted',
		defaultMessage:
			'{added, plural, =0 {No rows added} one {# row added} other {# rows added}}{refused, plural, =0 {} one {, # row refused} other {, # rows refused}}{rest, plural, =0 {} one {, # row not pasted} other {, # rows not pasted}}{skipped, plural, =0 {} one {, # cell skipped} other {, # cells skipped}}',
		description:
			'Spoken after a paste that adds rows to the grid past its last row. The counts are the rows added, the row that the grid refused, the rows after it that the paste did not add, and the cells that the new rows could not take.',
	},
	rowsHeld: {
		id: 'ui.grid.rowsHeld',
		defaultMessage:
			'{count, plural, one {# row not pasted} other {# rows not pasted}}. The new row has an entry.',
		description:
			'Spoken when a paste does not add rows past the last row, because the new row of the grid holds an entry of the reader.',
	},
	pasteWithRows: {
		id: 'ui.grid.pasteWithRows',
		defaultMessage: '{cells}. {rows}',
		description:
			'Spoken after a paste that writes into the rows of the grid and adds rows after them: the message of the written cells, then the message of the added rows.',
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
			'Range of {rows, plural, one {# row} other {# rows}} and {cols, plural, one {# column} other {# columns}}, {fromColumn} row {fromRow, number} to {toColumn} row {toRow, number}',
		description:
			'Spoken when the reader selects a range of cells of the grid: its size, and its two corners by column and row number.',
	},
	rangeFigure: {
		id: 'ui.grid.rangeFigure',
		defaultMessage:
			'{op, select, count {Count} sum {Sum} avg {Average} min {Minimum} other {Maximum}} {value}',
		description:
			'One figure of a range of cells of the grid, in its footer: the count of the cells with a value, or the sum, the average, the minimum, or the maximum of their numbers. The value is a formatted number.',
	},
	rangeWithFigures: {
		id: 'ui.grid.rangeWithFigures',
		defaultMessage: '{range}. {figures}',
		description:
			'Spoken when the reader selects a range of cells of a grid that shows the figures of the range: the sentence of the range, then the list of its figures.',
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
	side: PinSide | false,
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
 * redo redoes them, a paste pastes them, a fill fills them, a clear clears
 * them, and a cut cuts them. @internal
 */
export type GridSaveOutcome =
	| 'updated'
	| 'undone'
	| 'redone'
	| 'pasted'
	| 'filled'
	| 'cleared'
	| 'cut'

/** The outcome of a write of text into cells: a paste, a clear, or a cut. @internal */
export type GridPasteOutcome = Extract<GridSaveOutcome, 'pasted' | 'cleared' | 'cut'>

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
 * The polite announcement for the cells of one write as they settle (WCAG
 * 4.1.3). An async write gives the cells of all its batches, from one or more
 * rows, when its last batch settles. The sync sweep gives the cells that
 * `validate` refused. Accepted cells read as {@link describeCommit} does
 * (`Name updated for Alice`). Refused cells read the same way (`Name not saved
 * for Alice`). Both parts speak in one message (`Name updated, 2 cells not
 * saved for Alice`). The caller announces once for each write.
 *
 * @param saved - The column label of each accepted cell.
 * @param refused - The column label of each refused cell.
 * @param row - The label of the row that holds the cells, or `undefined` when
 * more than one row holds them.
 * @param outcome - What the write did to the accepted cells.
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
 * The assertive announcement for a save that the grid holds back, because
 * {@link GridColumn.validate} refuses a cell that the save closes (WCAG
 * 3.3.1). The editor stays open, so the message names the column and gives
 * its error: `Email: Enter a valid address`.
 *
 * @param column - The label of the column of the refused cell.
 * @param error - The message that `validate` gave.
 * @internal
 */
export function describeHeld(intl: IntlShape, column: string, error: string): string {
	return intl.formatMessage(messages.held, { column, error })
}

/**
 * The polite announcement for an undo or a redo that writes nothing (WCAG
 * 4.1.3). `'empty'` reads `Nothing to undo`. `'blocked'` reads `Cannot undo
 * while a cell has an edit`, because a cell of the entry is open in an editor
 * or holds a draft.
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
 * The polite announcement for the rows that a paste adds past the last row
 * (WCAG 4.1.3), such as `2 rows added, 1 row refused, 1 row not pasted`. A
 * `held` paste added no row, because the new row holds an entry. `lead` is
 * the message of the cells that the paste wrote into the data rows, which
 * comes first. @internal
 */
export function describePasteRows(
	intl: IntlShape,
	outcome: { added: number; refused: number; rest: number; skipped: number; held: boolean },
	lead: string | null,
): string {
	const { held, ...counts } = outcome

	const rows = held
		? intl.formatMessage(messages.rowsHeld, { count: counts.rest })
		: intl.formatMessage(messages.rowsPasted, counts)

	return lead ? intl.formatMessage(messages.pasteWithRows, { cells: lead, rows }) : rows
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

/**
 * One figure of a range as the footer shows it and the grid speaks it, such as
 * `Sum 1,240.50`. The value takes the number format of the aggregate rows.
 *
 * @param locale - The `<LocaleProvider>` locale of the number; the runtime locale without it.
 * @internal
 */
export function describeRangeFigure(
	intl: IntlShape,
	figure: GridRangeFigure,
	locale?: string,
): string {
	return intl.formatMessage(messages.rangeFigure, {
		op: figure.op,
		value: formatAggregate(figure.value, locale),
	})
}

/**
 * The sentence of a range, then the list of its figures. With no figure, the
 * sentence of the range alone. @internal
 */
export function describeRangeWithFigures(
	intl: IntlShape,
	range: string,
	figures: readonly string[],
): string {
	if (figures.length === 0) return range

	return intl.formatMessage(messages.rangeWithFigures, {
		range,
		figures: intl.formatList(figures, { type: 'unit' }),
	})
}
