'use client'

import { type ReactNode, type RefObject, useCallback, useMemo, useRef } from 'react'
import { useReportedChange } from '../../hooks/use-reported-change'
import { isColumnEditable } from './engine/grid-editing-utilities'
import { resolveCellAt } from './engine/grid-row/bridges'
import type { GridCellClick, GridCellClickContext } from './engine/grid-row/cell'
import type { GridEditSource } from './grid-data-types'
import { GridEditingSessionContext } from './grid-editing-context'
import type { GridEditableConfig } from './grid-editing-types'
import type { GridColumn } from './types'
import { useGridEditing } from './use-grid-editing'
import { useGridEditingColumns } from './use-grid-editing-columns'
import {
	type Coord,
	type GridCellActivate,
	type GridNavStore,
	type GridNavTableProps,
	type GridRowActivate,
	useGridNavigation,
} from './use-grid-navigation'
import { useGridNavigationColumns } from './use-grid-navigation-columns'

/** Whether two cursor positions name the same cell; `moveTo` mints a fresh `Coord` per move. @internal */
function sameCoord(a: Coord | null, b: Coord | null): boolean {
	return a?.row === b?.row && a?.col === b?.col
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
type GridCursorRefs<T> = {
	rowsRef: RefObject<T[]>
	colCountRef: RefObject<number>
	rowIndexMapRef: RefObject<Map<T, number>>
	colIndexMapRef: RefObject<Map<string | number, number>>
	rowKeysRef: RefObject<(string | number)[]>
	dataColumnsRef: RefObject<GridColumn<T>[]>
	editSourceRef: RefObject<GridEditSource<T>>
}

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
	editable,
	columns,
	onRowActivate,
	onCellActivate,
	onActiveCellChange,
	selectableRef,
	toggleActiveRow,
	scrollRowIntoViewRef,
	scrollContainerRef,
	refs,
}: {
	navigable: boolean
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
	scrollRowIntoViewRef: RefObject<((rowIndex: number) => void) | null>
	/** The grid's scroll container, measured for the cursor's viewport-relative PageUp/Down step. */
	scrollContainerRef: RefObject<HTMLElement | null>
	refs: GridCursorRefs<T>
}): {
	/** Whether the grid carries a keyboard cursor (`navigable` or editable). */
	cursorEnabled: boolean
	/** Cursor store to provide to the cells via {@link GridNavContext}. */
	navStore: GridNavStore
	/** `<table>` cursor props, with the editing key handler layered over navigation when editable. */
	navTableProps: GridNavTableProps | undefined
	/** Re-clamps the cursor to the current bounds; the grid drives it as rows/columns change. */
	reconcile: (rowCount: number, colCount: number) => void
	/** The augmented columns to feed the engine. */
	columns: GridColumn<T>[]
	/**
	 * The grid's own double-click-to-edit intent under `editable.trigger:
	 * 'doubleClick'` — {@link GridData} composes it ahead of the consumer's
	 * handler on the built-in cell double-click event. `undefined` otherwise.
	 */
	editOnCellDoubleClick: GridCellClick<T> | undefined
	/** Wraps the table with the editing contexts when editable, else returns it unchanged. */
	wrap: (children: ReactNode) => ReactNode
} {
	const editingEnabled = editable != null

	const cursorEnabled = navigable || editingEnabled

	// Grid-owned edit sessions: the grid begins one on a cell double-click or the
	// cursor's Enter; the default 'manual' mode leaves entry to the consumer.
	const sessionOwned = editingEnabled && editable.trigger === 'doubleClick'

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
	// (which in turn needs the cursor's `cellId`), so the wrapper reads it through
	// a ref assigned below.
	const enterEditAtRef = useRef<(rowIdx: number, colIdx: number) => void>(() => {})

	const onCellActivateWithEdit = useMemo<GridCellActivate | undefined>(() => {
		if (!sessionOwned) return onCellActivate

		return (rowIdx, colIdx, event) => {
			// The consumer's cell click fires first — the same order the pointer path
			// fires the single-click handlers ahead of the double-click.
			onCellActivate?.(rowIdx, colIdx, event)

			if (event.key === 'Enter') enterEditAtRef.current(rowIdx, colIdx)
		}
	}, [sessionOwned, onCellActivate])

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
	})

	/*
	 * One report for each cell the cursor lands on, read from the committed
	 * coordinate.
	 *
	 * Many call sites write that state: every arrow key, Home/End,
	 * PageUp/PageDown, and a click that seats the cursor. The re-clamp that
	 * follows a filter or a hidden column writes it too, so no single call site is
	 * the transition. The coordinate resolves to
	 * the same context `onCellClick` delivers, so the pointer and the keyboard
	 * name a cell the same way. A cursor cleared by an emptied grid reports null.
	 *
	 * A grid mounts with no cursor, and that null is the rest state rather than a
	 * transition, so the first run is skipped. The context is resolved when the
	 * cursor moves, so rows replaced under a stationary cursor do not re-report.
	 * The re-clamp moves the cursor whenever the bounds actually shrink.
	 *
	 * Compared by coordinate rather than identity. A `moveTo` mints a fresh
	 * `Coord` even where the clamp returns the cell the cursor already sits on.
	 * That is every arrow key held against an edge. No `cursorEnabled` gate, because
	 * `useGridNavigation` already returns a null cursor while it is off.
	 */
	useReportedChange(
		nav.active,
		(coord) => {
			// Resolved behind the callback check, not before it: the resolver runs the
			// column's own accessor, and every grid without this prop would pay for it
			// on each cursor move. Through the resolver the pointer channel takes, so
			// the two cannot name a cell differently.
			if (!onActiveCellChange) return

			if (!coord) {
				onActiveCellChange(null)

				return
			}

			const cell = resolveCellAt({ rowsRef, rowKeysRef, dataColumnsRef }, coord.row, coord.col)

			if (cell) onActiveCellChange(cell)
		},
		sameCoord,
	)

	const editing = useGridEditing<T>({
		enabled: editingEnabled,
		config: editable,
		editSourceRef,
		rowKeysRef,
		dataColumnsRef,
		cellId: nav.cellId,
	})

	// Begins the edit session on a named cell, gating on an editable column: a
	// `readOnly` or slotless/fieldless one never enters. The editing layer focuses
	// the cell's editor once that mounts.
	const enterEditAtCell = useCallback(
		(rowKey: string | number, columnId: string | number) => {
			const col = dataColumnsRef.current.find((candidate) => candidate.id === columnId)

			if (!col || !isColumnEditable(col)) return

			editing.enterEdit(rowKey, columnId)
		},
		[editing.enterEdit, dataColumnsRef],
	)

	// The keyboard entry starts from cursor indices, so it resolves them to the
	// cell's identity first — the one place that conversion belongs.
	const enterEditAt = useCallback(
		(rowIdx: number, colIdx: number) => {
			const rowKey = rowKeysRef.current[rowIdx]

			const col = dataColumnsRef.current[colIdx]

			if (rowKey === undefined || !col) return

			enterEditAtCell(rowKey, col.id)
		},
		[enterEditAtCell, rowKeysRef, dataColumnsRef],
	)

	enterEditAtRef.current = enterEditAt

	// The pointer entry, fired through the grid's built-in cell double-click event
	// (so the interactive-content guard and data-cell resolution apply). The event
	// already names the cell, so this path never touches display indices.
	const editOnCellDoubleClick = useMemo<GridCellClick<T> | undefined>(() => {
		if (!sessionOwned) return undefined

		return (cell) => enterEditAtCell(cell.rowKey, cell.columnId)
	}, [sessionOwned, enterEditAtCell])

	// Cursor-only augmentation for a plain navigable grid; editing-aware
	// augmentation (which mounts the editors) for an editable one.
	const navColumns = useGridNavigationColumns<T>({
		enabled: cursorEnabled && !editingEnabled,
		columns,
		rowIndexMapRef,
		colIndexMapRef,
		cellId: nav.cellId,
		moveTo: nav.moveTo,
	})

	const editColumns = useGridEditingColumns<T>({
		enabled: editingEnabled,
		columns,
		rowIndexMapRef,
		colIndexMapRef,
		rowKeysRef,
		cellId: nav.cellId,
		moveTo: nav.moveTo,
	})

	const { session } = editing

	// The `<table>` cursor props, with the session's keys layered ahead of
	// navigation when the grid owns the edit session: the table (the cursor's
	// `role="grid"` tab stop) sees every editor's keys — portaled panels
	// included, since portal events propagate through the React tree — so no
	// editor wires its own save or abandon.
	const navTableProps = useMemo<GridNavTableProps | undefined>(() => {
		const base = nav.navTableProps

		const sessionKeys = editing.sessionKeys

		if (!base || !sessionKeys) return base

		return {
			...base,
			onKeyDown: (event) => {
				sessionKeys(event)

				base.onKeyDown(event)
			},
		}
	}, [nav.navTableProps, editing.sessionKeys])

	const wrap = useMemo(
		() =>
			editingEnabled
				? (children: ReactNode) => (
						<GridEditingSessionContext value={session}>{children}</GridEditingSessionContext>
					)
				: (children: ReactNode) => children,
		[editingEnabled, session],
	)

	return {
		cursorEnabled,
		navStore: nav.store,
		navTableProps,
		reconcile: nav.reconcile,
		columns: editingEnabled ? editColumns : navColumns,
		editOnCellDoubleClick,
		wrap,
	}
}
