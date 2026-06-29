'use client'

import { type ReactNode, type RefObject, useMemo } from 'react'
import { GridRowEditingContext } from './grid-editing-context'
import type { GridEditableConfig } from './grid-editing-types'
import type { GridColumn } from './types'
import { useGridEditing } from './use-grid-editing'
import { useGridEditingColumns } from './use-grid-editing-columns'
import {
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
 * ({@link useGridNavigation}) and — when `editable` is set — the per-row editing
 * session ({@link useGridEditing}) behind one surface. Resolves the column
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
	selectableRef,
	toggleActiveRow,
	refs,
}: {
	navigable: boolean
	editable: GridEditableConfig | undefined
	/** The pinned/resolved columns to augment. */
	columns: GridColumn<T>[]
	onRowActivate: GridRowActivate | undefined
	/** Whether the grid has a selection column; gates the cursor's Space-to-select. */
	selectableRef: RefObject<boolean>
	/** Toggles the active row's selection by display index, for the cursor's Space key. */
	toggleActiveRow: ((rowIdx: number) => void) | undefined
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
	/** Wraps the table with the editing contexts when editable, else returns it unchanged. */
	wrap: (children: ReactNode) => ReactNode
} {
	const editingEnabled = editable != null

	const cursorEnabled = navigable || editingEnabled

	const { rowsRef, colCountRef, rowIndexMapRef, colIndexMapRef, rowKeysRef, dataColumnsRef } = refs

	const nav = useGridNavigation({
		enabled: cursorEnabled,
		rowsRef,
		colCountRef,
		onRowActivate,
		selectableRef,
		toggleActiveRow,
	})

	const editing = useGridEditing<T>({
		enabled: editingEnabled,
		config: editable,
		rowsRef,
		rowKeysRef,
		dataColumnsRef,
	})

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

	const { rowEditing } = editing

	const wrap = useMemo(
		() =>
			editingEnabled
				? (children: ReactNode) => (
						<GridRowEditingContext value={rowEditing}>{children}</GridRowEditingContext>
					)
				: (children: ReactNode) => children,
		[editingEnabled, rowEditing],
	)

	return {
		cursorEnabled,
		navStore: nav.store,
		navTableProps: nav.navTableProps,
		reconcile: nav.reconcile,
		columns: editingEnabled ? editColumns : navColumns,
		wrap,
	}
}
