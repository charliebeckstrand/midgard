'use client'

import { type ReactNode, type RefObject, useCallback, useMemo, useRef } from 'react'
import { isColumnEditable } from './engine/grid-editing-utilities'
import type { GridCellClick } from './engine/grid-row/cell'
import { GridEditingSessionContext } from './grid-editing-context'
import type { GridEditableConfig } from './grid-editing-types'
import type { GridColumn } from './types'
import { useGridEditing } from './use-grid-editing'
import { useGridEditingColumns } from './use-grid-editing-columns'
import {
	type GridCellActivate,
	type GridNavTableProps,
	type GridRowActivate,
	useGridNavigation,
} from './use-grid-navigation'
import { useGridNavigationColumns } from './use-grid-navigation-columns'

/** Live refs the cursor and editing layers read at event/render time, populated by {@link GridData} after the engine resolves order and rows. @internal */
type GridCursorRefs<T> = {
	rowsRef: RefObject<T[]>
	colCountRef: RefObject<number>
	rowIndexMapRef: RefObject<Map<T, number>>
	colIndexMapRef: RefObject<Map<string | number, number>>
	rowKeysRef: RefObject<(string | number)[]>
	dataColumnsRef: RefObject<GridColumn<T>[]>
}

/**
 * The cursor + editing layer for {@link GridData}, gathering the keyboard cursor
 * ({@link useGridNavigation}) and — when `editable` is set — the editing session
 * ({@link useGridEditing}) behind one surface. Resolves the column
 * augmentation (cursor-only vs. editing-aware), the `<table>` cursor props (with
 * the editing key handler layered on), the cursor store provider, and a `wrap`
 * that mounts the editing contexts around the table. Pulled out of
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
	navStore: ReturnType<typeof useGridNavigation>['store']
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

	const { rowsRef, colCountRef, rowIndexMapRef, colIndexMapRef, rowKeysRef, dataColumnsRef } = refs

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

	const editing = useGridEditing<T>({
		enabled: editingEnabled,
		config: editable,
		rowsRef,
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

	// The `<table>` cursor props, with the session's Escape layered ahead of
	// navigation when the grid owns the edit session: the table (the cursor's
	// `role="grid"` tab stop) sees every editor's keys — portaled panels
	// included, since portal events propagate through the React tree — so no
	// editor wires its own abandon.
	const navTableProps = useMemo<GridNavTableProps | undefined>(() => {
		const base = nav.navTableProps

		const sessionEscape = editing.sessionEscape

		if (!base || !sessionEscape) return base

		return {
			...base,
			onKeyDown: (event) => {
				sessionEscape(event)

				base.onKeyDown(event)
			},
		}
	}, [nav.navTableProps, editing.sessionEscape])

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
