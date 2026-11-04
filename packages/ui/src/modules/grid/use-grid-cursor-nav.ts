'use client'

import { type RefObject, useEffect, useRef } from 'react'
import { announce } from '../../core/announcer'
import { useReportedChange } from '../../hooks/use-reported-change'
import { useStableEvent } from '../../hooks/use-stable-event'
import { useIntl } from '../../primitives/intl/use-intl'
import { describeRange } from './engine/grid-announcements'
import { GRID_CELL } from './engine/grid-cell-controls'
import { columnAccessor } from './engine/grid-column/accessor'
import { columnLabel } from './engine/grid-column/label'
import { GRID_RANGE_ANNOUNCE_MS } from './engine/grid-constants'
import { cellText } from './engine/grid-export/accessor'
import { gridMessages } from './engine/grid-messages'
import type { GridRangeCells } from './engine/grid-range/range'
import { toTsv } from './engine/grid-range/tsv'
import type { GridCellActivate, GridRowActivate } from './engine/grid-row/bridges'
import { resolveCellAt } from './engine/grid-row/bridges'
import type { GridCellClickContext } from './engine/grid-row/cell'
import { ariaRowIndex } from './engine/grid-row/shell'
import type { GridColumn } from './types'
import type { GridIndexRefs } from './use-grid-index'
import {
	type Coord,
	type GridNewRowPosition,
	type GridScrollRowIntoView,
	NEW_ROW_INDEX,
	useGridNavigation,
} from './use-grid-navigation'
import { useGridTabStops } from './use-grid-tab-stops'

/**
 * The text of each cell of a range, row by row, as export reads a cell. A
 * cell whose row or column is gone reads as empty. @internal
 */
function rangeText<T>(
	cells: GridRangeCells,
	rows: readonly T[],
	columns: readonly GridColumn<T>[],
) {
	return cells.rows.map((index) => {
		const row = rows[index]

		return cells.cols.map((colIndex) => {
			const col = columns[colIndex]

			return col && row !== undefined ? cellText(columnAccessor(col)(row)) : ''
		})
	})
}

/**
 * The active cell as a range of one cell, or `null` when the cursor is on no
 * data cell. `active` is the public cursor, which names a data row. Copy and
 * paste act on it when the cursor holds no range. @internal
 */
export function activeCells(active: Coord | null): GridRangeCells | null {
	if (!active || active.row === NEW_ROW_INDEX) return null

	return { rows: [active.row], cols: [active.col], from: active, to: active }
}

/**
 * Live refs the cursor and editing layers read at event/render time, all populated
 * by {@link GridData}. The cursor's carry what the engine resolved: display
 * order, rows, and the visible data columns. `editSourceRef` is the exception,
 * and holds the grid's own inputs ahead of that narrowing, because the commit
 * path needs a row the window stopped rendering.
 *
 * @internal
 */
export type GridCursorRefs<T> = Omit<GridIndexRefs<T>, 'selectableRef' | 'toggleRowRef'>

/**
 * The keyboard cursor of a grid, which the read-only cursor
 * ({@link useGridCursor}) and the editing cursor ({@link useGridEditCursor})
 * share. It holds the navigation ({@link useGridNavigation}), the one tab stop
 * of the grid, the copy of a range, the speech of a range, and the report of
 * the active cell. The editing cursor gives the entry keys of a grid-owned
 * session and the new-row slot to the navigation.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function useGridCursorNav<T>({
	enabled,
	range,
	onRowActivate,
	onCellActivate,
	onActiveCellChange,
	selectableRef,
	toggleActiveRow,
	scrollRowIntoViewRef,
	scrollContainerRef,
	tableRef,
	refs,
	newRowRef,
	editsAt,
}: {
	/** Whether the grid carries a keyboard cursor (`navigable` or editable). */
	enabled: boolean
	/** Whether the cursor holds a cell range (see {@link GridDataProps.range}). */
	range: boolean
	onRowActivate: GridRowActivate | undefined
	/** Activates the cell under the cursor on Enter, ahead of the row activation. */
	onCellActivate: GridCellActivate | undefined
	/** Reports the cell the cursor sits on, whatever moved it. */
	onActiveCellChange: ((cell: GridCellClickContext<T> | null) => void) | undefined
	/** Whether the grid has a selection column; gates the cursor's Space-to-select. */
	selectableRef: RefObject<boolean>
	/** Toggles the active row's selection by display index, for the cursor's Space key. */
	toggleActiveRow: ((rowIndex: number) => void) | undefined
	/** Scrolls a row into the virtualized window before the cursor lands on it; null when unwindowed. */
	scrollRowIntoViewRef: RefObject<GridScrollRowIntoView | null>
	/** The grid's scroll container, measured for the cursor's viewport-relative PageUp/Down step. */
	scrollContainerRef: RefObject<HTMLElement | null>
	/** The grid `<table>`, the cursor's tab stop. */
	tableRef: RefObject<HTMLTableElement | null>
	refs: GridCursorRefs<T>
	/** Where the new-row slot shows, read at event time. */
	newRowRef: RefObject<GridNewRowPosition>
	/** Whether the editing layer takes Enter and F2 on a cell (see `useGridNavigation`). */
	editsAt: (row: number, col: number) => boolean
}) {
	const intl = useIntl()

	const { rowsRef, colCountRef, rowIndexMapRef, rowKeysRef, cursorColumnsRef, rowIndexOffsetRef } =
		refs

	const nav = useGridNavigation({
		enabled,
		rowsRef,
		colCountRef,
		onRowActivate,
		onCellActivate,
		selectableRef,
		toggleActiveRow,
		scrollRowIntoViewRef,
		scrollContainerRef,
		newRowRef,
		rowIndexMapRef: rowIndexMapRef as RefObject<Map<unknown, number>>,
		editsAt,
		range: enabled && range,
	})

	// The controls in the cells leave the tab order, so the grid is one tab stop.
	useGridTabStops(tableRef, enabled ? GRID_CELL : null)

	const { readRange, toCursorRow, rangeAnchor } = nav

	// A copy while the tab stop has focus writes the range as TSV, or the active
	// cell with no range. The native event needs no clipboard permission. The
	// browser sends it to the start of the text selection, else to the body,
	// never to a focused table, so the document hears it. A copy of selected
	// text, or from a control in the grid, stays the browser's.
	const copyRange = useStableEvent((event: ClipboardEvent) => {
		const table = tableRef.current

		if (!table || document.activeElement !== table || !event.clipboardData) return

		if (window.getSelection()?.isCollapsed === false) return

		const cells = readRange() ?? activeCells(nav.active)

		if (!cells) return

		event.preventDefault()

		event.clipboardData.setData(
			'text/plain',
			toTsv(rangeText(cells, rowsRef.current, cursorColumnsRef.current)),
		)
	})

	// Speaks the size and the corners of the range once it stops changing.
	const announceRange = useStableEvent(() => {
		const cells = readRange()

		if (!cells) return

		const columns = cursorColumnsRef.current

		// The `aria-rowindex` of the row: its place in the cursor's order counts the
		// group headers, totals, and detail panels above it. A windowed body can
		// leave the row out of the document, so the number does not come from there.
		const corner = ({ row, col }: Coord) => ({
			column: columns[col]
				? columnLabel(columns[col])
				: intl.formatMessage(gridMessages.columnNumber, { number: col + 1 }),
			row: ariaRowIndex(rowIndexOffsetRef.current, toCursorRow(row)),
		})

		announce(
			describeRange(
				intl,
				{ rows: cells.rows.length, cols: cells.cols.length },
				corner(cells.from),
				corner(cells.to),
			),
		)
	})

	const { active: rangeFocus } = nav

	const copies = enabled && range

	// The clipboard listeners act only on a seated cursor, so a grid with no
	// cursor keeps none on the document. A boolean, so a cursor move does not
	// add them again.
	const seated = copies && rangeFocus !== null

	useEffect(() => {
		if (!seated) return

		document.addEventListener('copy', copyRange)

		return () => document.removeEventListener('copy', copyRange)
	}, [seated, copyRange])

	useEffect(() => {
		if (!rangeAnchor || !rangeFocus) return

		const timer = setTimeout(announceRange, GRID_RANGE_ANNOUNCE_MS)

		return () => clearTimeout(timer)
	}, [rangeAnchor, rangeFocus, announceRange])

	// The row key and the column id of the cell that `onActiveCellChange` last
	// named, or `null` for no cell. Only the report reads it and writes it.
	const reportedCellRef = useRef<{ rowKey: string | number; columnId: string | number } | null>(
		null,
	)

	/*
	 * One report for each cell the cursor lands on, read from the committed
	 * coordinate.
	 *
	 * Many call sites write that state: every arrow key, Home/End,
	 * PageUp/PageDown, and a click that seats the cursor. The follow after a
	 * sort, a filter, or a column change writes it too, so no single call site is
	 * the transition. The coordinate resolves to
	 * the same context `onCellClick` delivers, so the pointer and the keyboard
	 * name a cell the same way. A cursor cleared by an emptied grid reports null.
	 *
	 * A grid mounts with no cursor, and that null is the rest state rather than a
	 * transition, so the first run is skipped. The context is resolved when the
	 * cursor moves, so rows replaced under a stationary cursor do not re-report.
	 *
	 * Compared by the row key and the column id, not by the coordinate. The
	 * follow moves the coordinate of a cell that a sort or a column change moves,
	 * and that cell is not a new cell. When the row or the column of the cell is
	 * gone, the follow gives a new coordinate object, so the cell in its place
	 * reports. No `enabled` gate, because `useGridNavigation` already
	 * returns a null cursor while it is off.
	 */
	useReportedChange(nav.active, (coord) => {
		// Resolved behind the callback check, not before it: the resolver runs the
		// column's own accessor, and every grid without this prop would pay for it
		// on each cursor move. Through the resolver the pointer channel takes, so
		// the two cannot name a cell differently.
		if (!onActiveCellChange) return

		// The new-row slot is not a data cell, so the cursor on it names none.
		if (!coord || coord.row === NEW_ROW_INDEX) {
			reportedCellRef.current = null

			onActiveCellChange(null)

			return
		}

		const cell = resolveCellAt({ rowsRef, rowKeysRef, cursorColumnsRef }, coord.row, coord.col)

		const reported = reportedCellRef.current

		if (!cell || (reported?.rowKey === cell.rowKey && reported.columnId === cell.columnId)) return

		reportedCellRef.current = { rowKey: cell.rowKey, columnId: cell.columnId }

		onActiveCellChange(cell)
	})

	return {
		nav,
		/** Whether the cursor holds a range, which copies and, when the grid edits, pastes and fills. */
		copies,
		/** Whether {@link copies} holds and the cursor is on a cell. */
		seated,
	}
}
