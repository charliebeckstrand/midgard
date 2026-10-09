'use client'

import {
	type KeyboardEvent,
	type ReactNode,
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
} from 'react'
import { announce } from '../../core'
import { useReportedChange } from '../../hooks/use-reported-change'
import { useStableEvent } from '../../hooks/use-stable-event'
import { describeRange } from './engine/grid-announcements'
import { columnAccessor } from './engine/grid-column/accessor'
import { columnLabel } from './engine/grid-column/label'
import { GRID_RANGE_ANNOUNCE_MS } from './engine/grid-constants'
import type { GridPasteCell } from './engine/grid-edit-commit'
import {
	type EditorKind,
	type GridKeyPress,
	inferEditorKind,
	isColumnEditable,
	readKeyPress,
	seedFromKey,
} from './engine/grid-editing-utilities'
import { cellText } from './engine/grid-export/accessor'
import { resolveNewRow } from './engine/grid-new-row'
import {
	fillPlan,
	type GridFillDirection,
	type GridFillRect,
	type GridRangeFill,
	type GridRangeFillDirection,
	rangeFillSource,
} from './engine/grid-range/fill'
import { pastePlacement } from './engine/grid-range/paste'
import type { GridRangeCells } from './engine/grid-range/range'
import { parseTsv, toTsv } from './engine/grid-range/tsv'
import type { GridCellActivate, GridRowActivate } from './engine/grid-row/bridges'
import { resolveCellAt } from './engine/grid-row/bridges'
import type { GridCellClick, GridCellClickContext } from './engine/grid-row/cell'
import type { GridEditSource } from './grid-data-types'
import { GridEditingSessionContext, GridNewRowContext } from './grid-editing-context'
import type { GridEditableConfig } from './grid-editing-types'
import type { GridColumn } from './types'
import { useGridCursorColumns } from './use-grid-cursor-columns'
import type { GridIndexRefs } from './use-grid-data-cursor'
import { useGridEditing } from './use-grid-editing'
import { useGridFillDrag } from './use-grid-fill-drag'
import { useGridFillHandle } from './use-grid-fill-handle'
import {
	type Coord,
	type GridNavStore,
	type GridNavTableProps,
	type GridNewRowPosition,
	type GridReconcile,
	type GridScrollRowIntoView,
	NEW_ROW_INDEX,
	useGridNavigation,
} from './use-grid-navigation'
import { useGridTouchEntry } from './use-grid-touch-entry'

/** Whether a press carries no modifier and no input method. @internal */
function isPlainKey(press: GridKeyPress): boolean {
	return !press.composing && !press.ctrlKey && !press.metaKey && !press.altKey
}

/**
 * The value a printable key seeds into the cursor cell's editor, or `null` when
 * the key must not open it. Only a cell whose editor the grid infers takes a
 * seed, because the grid knows the value type there. An `editCell` slot and the
 * yes/no listbox open with F2, Enter, or a double-click instead.
 *
 * @internal
 */
function typedSeed<T>(
	press: GridKeyPress,
	col: GridColumn<T> | undefined,
	row: T | undefined,
): string | number | null {
	if (!col || row == null || col.editCell || !isColumnEditable(col)) return null

	return seedFromKey(press, inferEditorKind(col.field != null ? row[col.field] : undefined))
}

/**
 * The value a printable key seeds into an editor of the new-row slot, or `null`
 * when the key must not open it. The slot holds no value, so `kindOf` names
 * the editor. As in a data row, only an editor that the grid infers takes a
 * seed.
 *
 * @internal
 */
function slotSeed<T>(
	press: GridKeyPress,
	col: GridColumn<T> | undefined,
	kindOf: (column: GridColumn<T>) => EditorKind,
): string | number | null {
	if (!col || col.editCell || !isColumnEditable(col)) return null

	return seedFromKey(press, kindOf(col))
}

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

		return cells.cols.map((colIdx) => {
			const col = columns[colIdx]

			return col && row !== undefined ? cellText(columnAccessor(col)(row)) : ''
		})
	})
}

/**
 * The active cell as a range of one cell, or `null` when the cursor is on no
 * data cell. `active` is the public cursor, which names a data row. Copy and
 * paste act on it when the cursor holds no range. @internal
 */
function activeCells(active: Coord | null): GridRangeCells | null {
	if (!active || active.row === NEW_ROW_INDEX) return null

	return { rows: [active.row], cols: [active.col], from: active, to: active }
}

/**
 * The cells that a block of clipboard fields writes into `cells`, each with
 * its row key and its column id (see {@link pastePlacement}). A place that
 * names no row or no column is left out. @internal
 */
function pasteTargets<T>(
	block: string[][],
	cells: GridRangeCells,
	keys: readonly (string | number)[],
	columns: readonly GridColumn<T>[],
): GridPasteCell[] {
	const size = { rows: keys.length, cols: columns.length }

	return pastePlacement(block, cells, size).flatMap(({ row, col, text }) => {
		const rowKey = keys[row]

		const column = columns[col]

		return rowKey === undefined || !column ? [] : [{ rowKey, columnId: column.id, text }]
	})
}

/**
 * The value that a fill reads from a data cell: its row's `field`, or
 * `undefined` for a cell with no row or no `field`. @internal
 */
function fillValue<T>(row: T | undefined, col: GridColumn<T> | undefined): unknown {
	return row != null && col?.field != null ? row[col.field] : undefined
}

/** The whole numbers from `from` to `to`, inclusive. @internal */
function span(from: number, to: number): number[] {
	return Array.from({ length: to - from + 1 }, (_, i) => from + i)
}

/**
 * The fill direction of a key press on the tab stop, or `null` for another
 * key. Ctrl/Cmd+D fills down and Ctrl/Cmd+R fills right. @internal
 */
function fillKey(press: GridKeyPress & { shiftKey: boolean }): GridRangeFillDirection | null {
	if (press.composing || press.altKey || press.shiftKey || !(press.ctrlKey || press.metaKey)) {
		return null
	}

	const key = press.key.toLowerCase()

	return key === 'd' ? 'down' : key === 'r' ? 'right' : null
}

/**
 * Live refs the cursor and editing layers read at event/render time, all populated
 * by {@link GridData}. The cursor's carry what the engine resolved — display
 * order, rows, and the visible data columns. `editSourceRef` is the exception,
 * and holds the grid's own inputs ahead of that narrowing, because the commit
 * path needs a row the window stopped rendering.
 *
 * @internal
 */
type GridCursorRefs<T> = Omit<GridIndexRefs<T>, 'selectableRef' | 'toggleRowRef'>

/**
 * The cursor + editing layer for {@link GridData}, gathering the keyboard cursor
 * ({@link useGridNavigation}) and — when `editable` is set — the editing session
 * ({@link useGridEditing}) behind one surface. Resolves four things:
 *
 * - the column augmentation (cursor-only vs. editing-aware);
 * - the `<table>` cursor props, with the editing key handler layered on;
 * - the cursor store provider;
 * - a `wrap` that mounts the editing contexts around the table.
 *
 * Pulled out of
 * {@link GridData} so its body stays within the cognitive-complexity budget and
 * the editing wiring reads as one concern.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function useGridCursor<T>({
	navigable,
	range,
	editable,
	columns,
	onRowActivate,
	onCellActivate,
	onActiveCellChange,
	selectableRef,
	toggleActiveRow,
	scrollRowIntoViewRef,
	scrollContainerRef,
	tableRef,
	refs,
	editSource,
}: {
	navigable: boolean
	/** Whether the cursor holds a cell range (see {@link GridDataProps.range}). */
	range: boolean
	editable: GridEditableConfig | undefined
	/** The pinned/resolved columns to augment. */
	columns: GridColumn<T>[]
	onRowActivate: GridRowActivate | undefined
	/** Activates the cell under the cursor on Enter, ahead of the row activation. */
	onCellActivate: GridCellActivate | undefined
	/** Reports the cell the cursor sits on, whatever moved it. */
	onActiveCellChange: ((cell: GridCellClickContext<T> | null) => void) | undefined
	/** Whether the grid has a selection column; gates the cursor's Space-to-select. */
	selectableRef: RefObject<boolean>
	/** Toggles the active row's selection by display index, for the cursor's Space key. */
	toggleActiveRow: ((rowIdx: number) => void) | undefined
	/** Scrolls a row into the virtualized window before the cursor lands on it; null when unwindowed. */
	scrollRowIntoViewRef: RefObject<GridScrollRowIntoView | null>
	/** The grid's scroll container, measured for the cursor's viewport-relative PageUp/Down step. */
	scrollContainerRef: RefObject<HTMLElement | null>
	/** The grid `<table>`, the cursor's tab stop. The editing layer reseats focus on it. */
	tableRef: RefObject<HTMLTableElement | null>
	refs: GridCursorRefs<T>
	/**
	 * The grid's own inputs in this render, the value that `editSourceRef` holds.
	 * The editing layer reads it during render, and the ref at event time.
	 */
	editSource: GridEditSource<T>
}): {
	/** Whether the grid carries a keyboard cursor (`navigable` or editable). */
	cursorEnabled: boolean
	/** Cursor store to provide to the cells via {@link GridNavContext}. */
	navStore: GridNavStore
	/** `<table>` cursor props, with the editing key handler layered over navigation when editable. */
	navTableProps: GridNavTableProps | undefined
	/** Follows the cursor into a new layout and clamps it; the grid drives it as rows and columns change. */
	reconcile: GridReconcile
	/** The augmented columns to feed the engine. */
	columns: GridColumn<T>[]
	/**
	 * The grid's own double-click-to-edit intent under `editable.session:
	 * 'managed'` — {@link GridData} composes it ahead of the consumer's
	 * handler on the built-in cell double-click event. `undefined` otherwise.
	 */
	editOnCellDoubleClick: GridCellClick<T> | undefined
	/** Wraps the table with the editing contexts when editable, else returns it unchanged. */
	wrap: (children: ReactNode) => ReactNode
	/** Where the new-row slot shows, or `null` when the grid shows none. */
	newRow: GridNewRowPosition
	/** One step through the undo history, for the grid's `ref` handle. */
	stepHistory: (step: 'undo' | 'redo') => boolean
	/** The fill of the range, for the cell context menu, or `undefined` while the grid cannot fill. */
	fill: GridRangeFill | undefined
} {
	const editingEnabled = editable != null

	const cursorEnabled = navigable || editingEnabled

	// Grid-owned edit sessions: the grid begins one on a cell double-click, a tap
	// on the active cell, or the cursor's Enter. The default 'manual' mode leaves
	// entry to the consumer.
	const managed = editingEnabled && editable.session === 'managed'

	// The new-row slot is a row of the cursor's order, first or last. The cursor
	// reads where it sits at event time.
	const newRowPosition = resolveNewRow(editable, managed)

	const newRowRef = useRef<GridNewRowPosition>(newRowPosition)

	// Synced before the layout effects of the hooks below, which clamp the
	// cursor to the slot.
	useLayoutEffect(() => {
		newRowRef.current = newRowPosition
	}, [newRowPosition])

	const {
		rowsRef,
		colCountRef,
		rowIndexMapRef,
		colIndexMapRef,
		rowKeysRef,
		dataColumnsRef,
		editSourceRef,
	} = refs

	// Enter on the cursor's active cell begins the edit session — the keyboard
	// peer of the pointer double-click. The entry resolver needs the editing hook
	// (which in turn needs the cursor's `cellId`), so the wrapper names
	// `enterEditAt` before its declaration below. The cursor calls the wrapper as
	// an effect event, at key time, when this render's resolver is in place.
	const onCellActivateWithEdit: GridCellActivate | undefined = managed
		? (rowIdx, colIdx, event) => {
				// The consumer's cell click fires first — the same order the pointer path
				// fires the single-click handlers ahead of the double-click.
				onCellActivate?.(rowIdx, colIdx, event)

				if (event.key === 'Enter') enterEditAt(rowIdx, colIdx)
			}
		: onCellActivate

	const nav = useGridNavigation({
		enabled: cursorEnabled,
		rowsRef,
		colCountRef,
		onRowActivate,
		onCellActivate: onCellActivateWithEdit,
		selectableRef,
		toggleActiveRow,
		scrollRowIntoViewRef,
		scrollContainerRef,
		newRowRef,
		rowIndexMapRef: rowIndexMapRef as RefObject<Map<unknown, number>>,
		range: cursorEnabled && range,
	})

	const { readRange, rangeAnchor } = nav

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
			toTsv(rangeText(cells, rowsRef.current, dataColumnsRef.current)),
		)
	})

	// Speaks the size and the corners of the range once it stops changing.
	const announceRange = useStableEvent(() => {
		const cells = readRange()

		if (!cells) return

		const columns = dataColumnsRef.current

		const corner = ({ row, col }: Coord) => ({
			column: columns[col] ? columnLabel(columns[col]) : `column ${col + 1}`,
			row: row + 1,
		})

		announce(
			describeRange(
				{ rows: cells.rows.length, cols: cells.cols.length },
				corner(cells.from),
				corner(cells.to),
			),
		)
	})

	const { active: rangeFocus } = nav

	const copies = cursorEnabled && range

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
	 * reports. No `cursorEnabled` gate, because `useGridNavigation` already
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

		const cell = resolveCellAt({ rowsRef, rowKeysRef, dataColumnsRef }, coord.row, coord.col)

		const reported = reportedCellRef.current

		if (!cell || (reported?.rowKey === cell.rowKey && reported.columnId === cell.columnId)) return

		reportedCellRef.current = { rowKey: cell.rowKey, columnId: cell.columnId }

		onActiveCellChange(cell)
	})

	const editing = useGridEditing<T>({
		enabled: editingEnabled,
		config: editable,
		editSource,
		editSourceRef,
		rowKeysRef,
		dataColumnsRef,
		tableRef,
		cellId: nav.cellId,
		moveTo: nav.moveTo,
	})

	const {
		enterEdit,
		newRow: { enter: enterNewRow },
	} = editing

	// Begins the edit session on a named cell, gating on an editable column: a
	// `readOnly` or slotless/fieldless one never enters. The editing layer focuses
	// the cell's editor once that mounts.
	const enterEditAtCell = useCallback(
		(rowKey: string | number, columnId: string | number, seed?: string | number) => {
			const col = dataColumnsRef.current.find((candidate) => candidate.id === columnId)

			if (!col || !isColumnEditable(col)) return

			enterEdit(rowKey, columnId, seed)
		},
		[enterEdit, dataColumnsRef],
	)

	// The keyboard entry starts from cursor indices, so it resolves them to the
	// cell's identity first — the one place that conversion belongs.
	// The new-row slot has no row key, so its cells open through the slot.
	const enterEditAt = useCallback(
		(rowIdx: number, colIdx: number, seed?: string | number) => {
			const col = dataColumnsRef.current[colIdx]

			if (col && rowIdx === NEW_ROW_INDEX) {
				enterNewRow(col.id, seed)

				return
			}

			const rowKey = rowKeysRef.current[rowIdx]

			if (rowKey === undefined || !col) return

			enterEditAtCell(rowKey, col.id, seed)
		},
		[enterEditAtCell, enterNewRow, rowKeysRef, dataColumnsRef],
	)

	// The keyboard entries beside the cursor's Enter, on the tab stop alone: F2
	// opens the active cell, and a printable key opens it with that character in
	// place of its value (see `typedSeed`). A press from inside the grid belongs
	// to its control, never to type-to-edit.
	const sessionEntryKeys = useStableEvent((event: KeyboardEvent<HTMLTableElement>) => {
		const { active } = nav

		if (event.target !== event.currentTarget || event.defaultPrevented || !active) return

		const press = readKeyPress(event)

		// The new-row slot is no data row, so the cursor's Enter activates
		// nothing there. Enter opens its cell, as F2 does.
		const slot = active.row === NEW_ROW_INDEX

		const column = dataColumnsRef.current[active.col]

		const seed =
			event.key === 'F2' || (slot && event.key === 'Enter')
				? undefined
				: slot
					? slotSeed(press, column, editing.newRow.editorKind)
					: typedSeed(press, column, rowsRef.current[active.row])

		if (seed === null || (seed === undefined && !isPlainKey(press))) return

		event.preventDefault()

		enterEditAt(active.row, active.col, seed)
	})

	// The pointer entry, fired through the grid's built-in cell double-click event
	// (so the interactive-content guard and data-cell resolution apply). The event
	// already names the cell, so this path never touches display indices.
	const editOnCellDoubleClick = useMemo<GridCellClick<T> | undefined>(() => {
		if (!managed) return undefined

		return (cell) => enterEditAtCell(cell.rowKey, cell.columnId)
	}, [managed, enterEditAtCell])

	// The touch entry. A touch screen sends no double-click, so a tap on the
	// cell that holds the cursor opens it (see `useGridTouchEntry`). It opens
	// through `enterEditAt`, as Enter does, so the same gates apply.
	const touchEntry = useGridTouchEntry(
		(coord) => nav.active?.row === coord.row && nav.active.col === coord.col,
		(coord) => enterEditAt(coord.row, coord.col),
	)

	// Cursor augmentation, editing-aware (which mounts the editors) for an
	// editable grid.
	const cursorColumns = useGridCursorColumns<T>({
		enabled: cursorEnabled,
		editing: editingEnabled,
		columns,
		rowIndexMapRef,
		colIndexMapRef,
		rowKeysRef,
		cellId: nav.cellId,
		seat: nav.seat,
		touch: managed ? touchEntry : undefined,
	})

	const { session, pasteCells } = editing

	// A paste while the tab stop has focus writes the clipboard's TSV into the
	// range, or from the active cell with no range. As with copy, the document
	// hears the event. A paste into an open editor stays the editor's, because
	// the editor, not the tab stop, has focus.
	const pasteRange = useStableEvent((event: ClipboardEvent) => {
		const table = tableRef.current

		if (!pasteCells || !table || document.activeElement !== table || !event.clipboardData) return

		const cells = readRange() ?? activeCells(nav.active)

		if (!cells) return

		event.preventDefault()

		const block = parseTsv(event.clipboardData.getData('text/plain'))

		pasteCells(pasteTargets(block, cells, rowKeysRef.current, dataColumnsRef.current))
	})

	const { fillCells } = editing

	// Fills `count` lines after a source block in `direction`, as one save.
	const writeFill = useStableEvent(
		(
			source: { rows: readonly number[]; cols: readonly number[] },
			direction: GridFillDirection,
			count: number,
		) => {
			const rows = rowsRef.current

			const keys = rowKeysRef.current

			const columns = dataColumnsRef.current

			const targets = fillPlan(source, direction, count, (row, col) =>
				fillValue(rows[row], columns[col]),
			)

			fillCells?.(
				targets.flatMap(({ row, col, value }) => {
					const rowKey = keys[row]

					const column = columns[col]

					return rowKey === undefined || !column ? [] : [{ rowKey, columnId: column.id, value }]
				}),
			)
		},
	)

	// The fill of the range from its top row down, or from its first column
	// right, bound to the range as it is now.
	const planFill = useStableEvent((direction: GridRangeFillDirection) => {
		const cells = readRange()

		const plan = cells && rangeFillSource(cells, direction)

		if (!fillCells || !plan) return null

		return () => writeFill(plan.source, direction, plan.count)
	})

	// The source of a drag of the fill handle: the range, else the active cell.
	const readFillSource = useStableEvent((): GridFillRect | null => {
		const cells = readRange() ?? activeCells(nav.active)

		const top = cells?.rows[0]

		const left = cells?.cols[0]

		if (!cells || top === undefined || left === undefined) return null

		const bottom = cells.rows[cells.rows.length - 1] ?? top

		const right = cells.cols[cells.cols.length - 1] ?? left

		return { top, bottom, left, right }
	})

	const fillFromHandle = useStableEvent(
		(source: GridFillRect, direction: GridFillDirection, count: number) =>
			writeFill(
				{ rows: span(source.top, source.bottom), cols: span(source.left, source.right) },
				direction,
				count,
			),
	)

	const startFillDrag = useGridFillDrag({
		readSource: readFillSource,
		showRange: nav.showRange,
		fill: fillFromHandle,
		cellCoordOf: nav.cellCoordOf,
		scrollContainerRef,
	})

	const fills = copies && fillCells !== undefined

	// The fill of the context menu. Absent while the grid cannot fill.
	const fill = fills ? planFill : undefined

	const fillHandle = useGridFillHandle(fills ? startFillDrag : null)

	// The cursor store of the cells, with the fill handle while the grid can
	// fill. The active cell holds the handle.
	const navStore = useMemo<GridNavStore>(
		() => (fillHandle ? { ...nav.store, fillHandle } : nav.store),
		[fillHandle, nav.store],
	)

	// The fill keys act on the tab stop only. Each claims its press only when
	// it fills, so the browser keeps the key otherwise.
	const fillKeys = useMemo(() => {
		if (!fills) return undefined

		return (event: KeyboardEvent<HTMLTableElement>) => {
			if (event.target !== event.currentTarget || event.defaultPrevented) return

			const direction = fillKey({ ...readKeyPress(event), shiftKey: event.shiftKey })

			const run = direction === null ? null : planFill(direction)

			if (!run) return

			event.preventDefault()

			run()
		}
	}, [fills, planFill])

	const pastes = seated && pasteCells !== undefined

	useEffect(() => {
		if (!pastes) return

		document.addEventListener('paste', pasteRange)

		return () => document.removeEventListener('paste', pasteRange)
	}, [pastes, pasteRange])

	// The `<table>` cursor props, with the history keys layered ahead of
	// navigation when the history is on, and the session's keys when the grid
	// owns the edit session: the table (the cursor's
	// `role="grid"` tab stop) sees every editor's keys — portaled panels
	// included, since portal events propagate through the React tree — so no
	// editor wires its own save or abandon. The entry keys follow, and the
	// cursor's own keys come last. The session's commit on leave goes ahead of
	// the cursor's own focus loss in the same way, and only under a `commitOn`
	// that asks for it.
	const navTableProps = useMemo<GridNavTableProps | undefined>(() => {
		const base = nav.navTableProps

		const sessionKeys = editing.sessionKeys

		const historyKeys = editing.historyKeys

		const sessionLeave = editing.sessionLeave

		if (!base || (!sessionKeys && !historyKeys)) return base

		return {
			...base,
			onKeyDown: (event) => {
				// The history keys need no grid-owned session, so they come first.
				historyKeys?.(event)

				fillKeys?.(event)

				if (sessionKeys) {
					sessionKeys(event)

					sessionEntryKeys(event)
				}

				base.onKeyDown(event)
			},
			onBlur: sessionLeave
				? (event) => {
						sessionLeave.blur(event)

						base.onBlur(event)
					}
				: base.onBlur,
			onFocus: sessionLeave
				? (event) => {
						sessionLeave.focus(event)

						base.onFocus(event)
					}
				: base.onFocus,
		}
	}, [
		nav.navTableProps,
		editing.sessionKeys,
		editing.historyKeys,
		editing.sessionLeave,
		sessionEntryKeys,
		fillKeys,
	])

	const newRowSession = editing.newRow.session

	const wrap = useMemo(
		() =>
			editingEnabled
				? (children: ReactNode) => (
						<GridEditingSessionContext value={session}>
							<GridNewRowContext value={newRowSession}>{children}</GridNewRowContext>
						</GridEditingSessionContext>
					)
				: (children: ReactNode) => children,
		[editingEnabled, session, newRowSession],
	)

	return {
		cursorEnabled,
		navStore,
		navTableProps,
		reconcile: nav.reconcile,
		columns: cursorColumns,
		editOnCellDoubleClick,
		wrap,
		newRow: newRowPosition,
		stepHistory: editing.stepHistory,
		fill,
	}
}
