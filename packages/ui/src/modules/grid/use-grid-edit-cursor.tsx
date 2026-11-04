'use client'

import {
	type KeyboardEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'
import { GridEditingSessionContext, type GridNavStore, GridNewRowContext } from './context'
import type { GridPasteCell } from './engine/grid-edit-commit'
import {
	type EditorKind,
	type GridKeyPress,
	inferEditorKind,
	isColumnEditable,
	readKeyPress,
	seedFromKey,
	shortcutLetter,
} from './engine/grid-editing-utilities'
import { resolveNewRow } from './engine/grid-new-row'
import { resolveNewRowAddWidth, withNewRowAddColumn } from './engine/grid-new-row-column'
import {
	fillPlan,
	type GridFillDirection,
	type GridFillRect,
	type GridRangeFillDirection,
	rangeFillSource,
} from './engine/grid-range/fill'
import { pastePlacement } from './engine/grid-range/paste'
import type { GridRangeCells, GridRowStep } from './engine/grid-range/range'
import { parseTsv } from './engine/grid-range/tsv'
import type { GridCellActivate } from './engine/grid-row/bridges'
import type { GridCellClick } from './engine/grid-row/cell'
import { GridEditOverlay } from './grid-edit-overlay'
import { GridEditingCell } from './grid-editing-cell'
import { GridNewRow } from './grid-new-row'
import type { GridColumn } from './types'
import type { GridCursor, GridCursorInput, GridNewRowSlotProps } from './use-grid-cursor'
import { useGridCursorColumns } from './use-grid-cursor-columns'
import { activeCells, useGridCursorNav } from './use-grid-cursor-nav'
import { useGridEditing } from './use-grid-editing'
import { useGridFillDrag } from './use-grid-fill-drag'
import { useGridFillHandle } from './use-grid-fill-handle'
import {
	type Coord,
	type GridNavTableProps,
	type GridNewRowPosition,
	NEW_ROW_INDEX,
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
 * when the key must not open it. The slot holds no value, so `getKind` names
 * the editor. As in a data row, only an editor that the grid infers takes a
 * seed.
 *
 * @internal
 */
function slotSeed<T>(
	press: GridKeyPress,
	col: GridColumn<T> | undefined,
	getKind: (column: GridColumn<T>) => EditorKind,
): string | number | null {
	if (!col || col.editCell || !isColumnEditable(col)) return null

	return seedFromKey(press, getKind(col))
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
	step: GridRowStep,
): GridPasteCell[] {
	return pastePlacement(block, cells, columns.length, step).flatMap(({ row, col, text }) => {
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
	return Array.from({ length: to - from + 1 }, (_, index) => from + index)
}

/**
 * The fill direction of a key press on the tab stop, or `null` for another
 * key. Ctrl/Cmd+D fills down and Ctrl/Cmd+R fills right. @internal
 */
function fillKey(press: GridKeyPress & { shiftKey: boolean }): GridRangeFillDirection | null {
	if (press.composing || press.altKey || press.shiftKey || !(press.ctrlKey || press.metaKey)) {
		return null
	}

	const key = shortcutLetter(press)

	return key === 'd' ? 'down' : key === 'r' ? 'right' : null
}

/**
 * The cursor + editing layer of an editable {@link GridData}. It gathers the
 * keyboard cursor ({@link useGridCursorNav}) and the editing session
 * ({@link useGridEditing}) behind the surface of {@link GridCursor}. It
 * resolves these parts:
 *
 * - the column augmentation, which mounts the editors;
 * - the `<table>` cursor props, with the editing key handler layered on;
 * - the cursor store provider, with the fill handle;
 * - a `wrap` that mounts the editing contexts around the table;
 * - the new-row slot.
 *
 * Only the chunk of an editable grid holds it ({@link GridDataEditable}). A
 * grid that cannot edit takes {@link useGridCursor}, so it does not load the
 * editing layer.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function useGridEditCursor<T>({
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
}: GridCursorInput<T>): GridCursor<T> {
	// The width that the Add cell of the new-row slot measures for its control,
	// or `null` before a measure.
	const [measuredAddWidth, setMeasuredAddWidth] = useState<number | null>(null)

	const editingEnabled = editable != null

	const cursorEnabled = navigable || editingEnabled

	// Grid-owned edit sessions: the grid begins one on a cell double-click, a tap
	// on the active cell, or the cursor's Enter. The default 'manual' mode leaves
	// entry to the consumer.
	const managed = editingEnabled && editable.session === 'managed'

	// The new-row slot is a row of the cursor's order, first or last. The cursor
	// reads where it sits at event time.
	const newRowPosition = resolveNewRow(editable, managed)

	// The Add control of the slot has a column of its own after the others (see
	// `withNewRowAddColumn`). It joins after the column order and visibility
	// state, so no saved state names it. It follows the configured slot, not the
	// loading state, so the column set stays stable. Its width is the one that the
	// Add cell measures for its control, unless `newRowAdd.width` fixes it. The
	// column joins before the cursor columns, so its cells are cells of the
	// cursor, as the cells of the other columns are.
	const addWidth = resolveNewRowAddWidth(
		newRowPosition !== null,
		editable?.newRowAdd,
		measuredAddWidth,
	)

	const withAdd = useMemo(() => withNewRowAddColumn(columns, addWidth), [columns, addWidth])

	const newRowRef = useRef<GridNewRowPosition>(newRowPosition)

	// Synced before the layout effects of the hooks below, which clamp the
	// cursor to the slot.
	useLayoutEffect(() => {
		newRowRef.current = newRowPosition
	}, [newRowPosition])

	const { rowsRef, rowIndexMapRef, colIndexMapRef, rowKeysRef, cursorColumnsRef, editSourceRef } =
		refs

	// Enter on the cursor's active cell begins the edit session: the keyboard
	// peer of the pointer double-click. Shift+Enter opens the row in its form. The entry resolver needs the editing hook
	// (which in turn needs the cursor's `cellId`), so the wrapper names
	// `enterEditAt` before its declaration below. The cursor calls the wrapper as
	// an effect event, at key time, when this render's resolver is in place.
	const onCellActivateWithEdit: GridCellActivate | undefined = managed
		? (rowIndex, colIndex, event) => {
				// The consumer's cell click fires first: the same order the pointer path
				// fires the single-click handlers ahead of the double-click.
				onCellActivate?.(rowIndex, colIndex, event)

				if (event.key !== 'Enter') return

				// Shift+Enter opens the form of the row, and Enter opens the cell.
				if (event.shiftKey) expandAt(rowIndex, colIndex)
				else enterEditAt(rowIndex, colIndex)
			}
		: onCellActivate

	// Under a grid-owned session, Enter and F2 on an editable cell open its
	// editor, so the cursor leaves both keys to the editing layer there.
	const editsAt = useStableEvent((_row: number, col: number) => {
		const column = cursorColumnsRef.current[col]

		return managed && column !== undefined && isColumnEditable(column)
	})

	const { nav, copies, seated } = useGridCursorNav<T>({
		enabled: cursorEnabled,
		range,
		onRowActivate,
		onCellActivate: onCellActivateWithEdit,
		onActiveCellChange,
		selectableRef,
		toggleActiveRow,
		scrollRowIntoViewRef,
		scrollContainerRef,
		tableRef,
		refs,
		newRowRef,
		editsAt,
	})

	const { readRange } = nav

	// A press on a cell of the new-row slot seats the cursor there, with the
	// guard of a press on a data cell. While a drag holds the press owner, a
	// press, such as the tap of a palm, does not seat the cursor.
	const seatNewRow = useStableEvent((col: number) => {
		if (nav.press.held()) return

		nav.moveTo({ row: NEW_ROW_INDEX, col })
	})

	// The cursor's cell at event time, which the form of a row opens on.
	const readCursor = useStableEvent(() => nav.active)

	const editing = useGridEditing<T>({
		enabled: editingEnabled,
		config: editable,
		editSource,
		editSourceRef,
		rowKeysRef,
		cursorColumnsRef,
		tableRef,
		cellId: nav.cellId,
		moveTo: nav.moveTo,
		seatNewRow,
		rowStep: nav.rowStep,
		readCursor,
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
			const col = cursorColumnsRef.current.find((candidate) => candidate.id === columnId)

			if (!col || !isColumnEditable(col)) return

			enterEdit(rowKey, columnId, seed)
		},
		[enterEdit, cursorColumnsRef],
	)

	// The keyboard entry starts from cursor indices, so it resolves them to the
	// cell's identity first: the one place that conversion belongs.
	// The new-row slot has no row key, so its cells open through the slot.
	const enterEditAt = useCallback(
		(rowIndex: number, colIndex: number, seed?: string | number) => {
			const col = cursorColumnsRef.current[colIndex]

			if (col && rowIndex === NEW_ROW_INDEX) {
				if (isColumnEditable(col)) enterNewRow(col.id, seed)

				return
			}

			const rowKey = rowKeysRef.current[rowIndex]

			if (rowKey === undefined || !col) return

			enterEditAtCell(rowKey, col.id, seed)
		},
		[enterEditAtCell, enterNewRow, rowKeysRef, cursorColumnsRef],
	)

	// Shift+Enter on the cursor opens the form of the row, with focus in the
	// field of the cursor column. The new-row slot has no form.
	const expandAt = useCallback(
		(rowIndex: number, colIndex: number) => {
			const rowKey = rowKeysRef.current[rowIndex]

			const col = cursorColumnsRef.current[colIndex]

			if (rowIndex === NEW_ROW_INDEX || rowKey === undefined || !col) return

			editing.session.expandRow(rowKey, col.id)
		},
		[editing.session, rowKeysRef, cursorColumnsRef],
	)

	// The seed of a keyboard entry into the editable cell at `active`: a value
	// in place of the value of the cell, `undefined` to open the cell with its
	// own value, or `null` for a key that opens nothing.
	const entrySeed = useStableEvent(
		(event: KeyboardEvent<HTMLTableElement>, active: Coord, column: GridColumn<T>) => {
			const press = readKeyPress(event)

			// The new-row slot is no data row, so the cursor's Enter activates
			// nothing there. Enter opens its cell, as F2 does.
			const slot = active.row === NEW_ROW_INDEX

			const seed =
				event.key === 'F2' || (slot && event.key === 'Enter')
					? undefined
					: slot
						? slotSeed(press, column, editing.newRow.editorKind)
						: typedSeed(press, column, rowsRef.current[active.row])

			return seed === undefined && !isPlainKey(press) ? null : seed
		},
	)

	// The keyboard entries beside the cursor's Enter, on the tab stop alone: F2
	// opens the active cell, and a printable key opens it with that character in
	// place of its value (see `typedSeed`). A press from inside the grid belongs
	// to its control, never to type-to-edit.
	const sessionEntryKeys = useStableEvent((event: KeyboardEvent<HTMLTableElement>) => {
		const { active } = nav

		if (event.target !== event.currentTarget || event.defaultPrevented || !active) return

		const column = cursorColumnsRef.current[active.col]

		// A cell that cannot edit, such as an actions cell, leaves the keys to the
		// cursor, whose Enter and F2 move focus to the controls of the cell.
		if (!column || !isColumnEditable(column)) return

		const seed = entrySeed(event, active, column)

		if (seed === null) return

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

	// The touch entry. A touch screen sends no double-click, so the grid finds
	// a double tap on a cell itself (see `useGridTouchEntry`). It opens through
	// `enterEditAt`, as Enter does, so the same gates apply.
	const touchEntry = useGridTouchEntry((coord) => enterEditAt(coord.row, coord.col))

	// Cursor augmentation, editing-aware (which mounts the editors) for an
	// editable grid.
	const cursorColumns = useGridCursorColumns<T>({
		enabled: cursorEnabled,
		EditingCell: editingEnabled ? GridEditingCell : undefined,
		columns: withAdd,
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

		pasteCells(
			pasteTargets(block, cells, rowKeysRef.current, cursorColumnsRef.current, nav.rowStep),
		)
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

			const columns = cursorColumnsRef.current

			const targets = fillPlan(
				source,
				direction,
				count,
				(row, col) => fillValue(rows[row], columns[col]),
				nav.rowStep,
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

		const bottom = cells.rows.at(-1) ?? top

		const right = cells.cols.at(-1) ?? left

		return { top, bottom, left, right }
	})

	// The rows of the source run from its top row to its bottom row, over the
	// rows that the cursor shows.
	const fillFromHandle = useStableEvent(
		(source: GridFillRect, direction: GridFillDirection, count: number) => {
			const height = nav.rowDistance(source.top, source.bottom) + 1

			const rows = Array.from({ length: height }, (_, i) => nav.rowStep(source.top, i) ?? [])

			writeFill({ rows: rows.flat(), cols: span(source.left, source.right) }, direction, count)
		},
	)

	const startFillDrag = useGridFillDrag({
		readSource: readFillSource,
		showRange: nav.showRange,
		fill: fillFromHandle,
		parseCellCoord: nav.parseCellCoord,
		rowStep: nav.rowStep,
		rowDistance: nav.rowDistance,
		scrollContainerRef,
		press: nav.press,
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
	// `role="grid"` tab stop) sees every editor's keys (portaled panels
	// included, since portal events propagate through the React tree), so no
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

	// On a phone the overlay holds the open editors. On a wider screen it holds
	// the form of an expanded row. It sits beside the table, so its keys and
	// focus moves do not reach the key surface of the table.
	const wrap = useMemo(
		() =>
			editingEnabled
				? (children: ReactNode) => (
						<GridEditingSessionContext value={session}>
							<GridNewRowContext value={newRowSession}>{children}</GridNewRowContext>

							<GridEditOverlay
								kind={session.overlay ?? session.form}
								shows={session.overlay === null ? 'expanded' : 'open'}
								session={session}
								columns={columns}
								source={editSource}
								clearCursor={nav.clear}
							/>
						</GridEditingSessionContext>
					)
				: (children: ReactNode) => children,
		[editingEnabled, session, newRowSession, columns, editSource, nav.clear],
	)

	// The new-row slot, which reports the width of its Add control back to the
	// column of that control.
	const renderNewRow = useCallback(
		(props: GridNewRowSlotProps<T>) => (
			<GridNewRow<T> {...props} onMeasureAdd={setMeasuredAddWidth} />
		),
		[],
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
		renderNewRow,
		stepHistory: editing.stepHistory,
		fill,
	}
}
