'use client'

import { type ReactNode, type RefObject, useMemo } from 'react'
import { GridEditingCoordContext, GridEditSessionContext } from './grid-editing-context'
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
	tableRef: RefObject<HTMLTableElement | null>
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
	refs,
}: {
	navigable: boolean
	editable: GridEditableConfig | undefined
	/** The pinned/resolved columns to augment. */
	columns: GridColumn<T>[]
	onRowActivate: GridRowActivate | undefined
	refs: GridCursorRefs<T>
}): {
	/** Whether the grid carries a keyboard cursor (`navigable` or editable). */
	cursorEnabled: boolean
	/** Cursor store to provide to the cells via {@link GridNavContext}. */
	navStore: ReturnType<typeof useGridNavigation>['store']
	/** `<table>` cursor props, with the editing key handler layered over navigation when editable. */
	navTableProps: GridNavTableProps | undefined
	/** The augmented columns to feed the engine. */
	columns: GridColumn<T>[]
	/** Wraps the table with the editing contexts when editable, else returns it unchanged. */
	wrap: (children: ReactNode) => ReactNode
} {
	const editingEnabled = editable != null

	const cursorEnabled = navigable || editingEnabled

	const {
		rowsRef,
		colCountRef,
		rowIndexMapRef,
		colIndexMapRef,
		rowKeysRef,
		dataColumnsRef,
		tableRef,
	} = refs

	const nav = useGridNavigation({ enabled: cursorEnabled, rowsRef, colCountRef, onRowActivate })

	const editing = useGridEditing<T>({
		enabled: editingEnabled,
		config: editable,
		active: nav.active,
		moveTo: nav.moveTo,
		navKeyDown: nav.navTableProps?.onKeyDown,
		rowsRef,
		rowKeysRef,
		dataColumnsRef,
		tableRef,
	})

	// Cursor-only augmentation for a plain navigable grid; editing-aware
	// augmentation (editor mount + double-click-to-edit) for an editable one.
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
		cellId: nav.cellId,
		moveTo: nav.moveTo,
		isCellEditable: editing.isCellEditable,
		beginEdit: editing.beginEdit,
	})

	// Layer the editing key handler (Enter / type-to-edit) over the navigation
	// cursor's; a read-only navigable grid keeps the bare cursor handler.
	const navTableProps = useMemo<GridNavTableProps | undefined>(() => {
		if (!nav.navTableProps) return undefined

		return editingEnabled
			? { ...nav.navTableProps, onKeyDown: editing.onTableKeyDown }
			: nav.navTableProps
	}, [nav.navTableProps, editingEnabled, editing.onTableKeyDown])

	const { editingCoord, session } = editing

	const wrap = useMemo(
		() =>
			editingEnabled
				? (children: ReactNode) => (
						<GridEditingCoordContext value={editingCoord}>
							<GridEditSessionContext value={session}>{children}</GridEditSessionContext>
						</GridEditingCoordContext>
					)
				: (children: ReactNode) => children,
		[editingEnabled, editingCoord, session],
	)

	return {
		cursorEnabled,
		navStore: nav.store,
		navTableProps,
		columns: editingEnabled ? editColumns : navColumns,
		wrap,
	}
}
