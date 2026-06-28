'use client'

import { useCallback, useMemo } from 'react'
import { useControllable } from '../../hooks'
import type { SortState } from './context'
import type { GridColumnManagerConfig } from './grid-data-types'
import type { GridContextMenu as GridContextMenuConfig } from './types'
import type { GridColumnResize } from './use-grid-table'

/** Context menus are on by default (both header and cell); `contextMenu={false}` disables them. @internal */
const DEFAULT_CONTEXT_MENU = { column: true, cell: true } as const

/**
 * Resolves the column-manager gates, lifts the dialog's open state, and derives
 * the header context-menu actions (sort a column, open the manager). Column
 * management is on by default ({@link GridColumnManagerConfig.enabled}); the
 * toolbar button is opt-in ({@link GridColumnManagerConfig.toolbarButton}). Split
 * out of `GridData` so its body stays within the cognitive-complexity budget.
 *
 * @internal
 */
export function useGridMenuActions<T>({
	contextMenu,
	columnManagerConfig,
	resize,
	setSort,
	hasData,
}: {
	contextMenu: GridContextMenuConfig<T> | false | undefined
	columnManagerConfig: GridColumnManagerConfig | undefined
	resize: GridColumnResize | null
	setSort: (sort: SortState[]) => void
	/** Right-click menus stand down with no source data (its items act on rows). */
	hasData: boolean
}) {
	// Context menus are on by default (`false` opts out), but never without data.
	const configured = contextMenu === false ? undefined : (contextMenu ?? DEFAULT_CONTEXT_MENU)

	const menu = hasData ? configured : undefined

	// Column management is on by default; `enabled: false` is the master off
	// switch — no "Manage columns" item, no toolbar button, no dialog.
	const managerEnabled = columnManagerConfig?.enabled ?? true

	const managerLabel = columnManagerConfig?.label ?? 'Manage columns'

	// Two entry points to the dialog, both under the master switch: the opt-in
	// toolbar button, and the header menu's "Manage columns" item (shown whenever
	// a column menu is). The dialog mounts when either can reach it.
	const showButton = managerEnabled && (columnManagerConfig?.toolbarButton ?? false)

	const menuItemReachable = managerEnabled && Boolean(menu?.column)

	const renderDialog = showButton || menuItemReachable

	const [open, setOpen] = useControllable<boolean>({
		value: columnManagerConfig?.open,
		defaultValue: columnManagerConfig?.defaultOpen ?? false,
		onValueChange: (next) => columnManagerConfig?.onOpenChange?.(next ?? false),
	})

	// The menu sets a single-column sort, replacing any multi-column sort; Clear
	// sort empties it. (Multi-column sorting is the header Shift-click path.)
	const sortColumn = useCallback(
		(column: string | number, direction: 'asc' | 'desc') => setSort([{ column, direction }]),
		[setSort],
	)

	const clearSort = useCallback(() => setSort([]), [setSort])

	// Backs the menu's "Manage columns" item; `null` keeps it out. Non-null
	// implies `renderDialog`, so opening is always valid (the item only ever
	// renders inside a column menu, which the master switch already gated).
	const chooseColumns = useMemo(
		() => (renderDialog ? () => setOpen(true) : null),
		[renderDialog, setOpen],
	)

	return {
		contextMenu: menu,
		renderDialog,
		showButton,
		managerLabel,
		columnManagerOpen: open ?? false,
		setColumnManagerOpen: setOpen,
		sortColumn,
		clearSort,
		// Header "Auto-size columns" — only when resizing is on.
		autoSizeColumns: resize?.sizeToFit ?? null,
		chooseColumns,
	}
}
