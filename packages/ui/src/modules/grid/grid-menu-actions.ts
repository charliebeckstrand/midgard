'use client'

import { useCallback, useMemo, useState } from 'react'
import { useControllable } from '../../hooks'
import type { SortState } from './context'
import { resolveToolSurfaces, SURFACES_OFF } from './engine/grid-tools'
import type { GridColumnManagerConfig } from './grid-data-types'
import type { GridContextMenu as GridContextMenuConfig } from './types'
import type { GridColumnResize } from './use-grid-table'

/** Context menus are on by default (both header and cell); `contextMenu={false}` disables them. @internal */
const DEFAULT_CONTEXT_MENU = { column: true, cell: true } as const

/**
 * Resolves the column-manager gates, lifts the dialog's open state, and derives
 * the header context-menu actions (sort a column, open the manager). The manager
 * takes the standard {@link GridToolSurfaces}: the context-menu item by default,
 * the toolbar button opt-in, and `columnManager={false}` as the off switch.
 * Split out of `GridData` so its body stays within the cognitive-complexity
 * budget.
 *
 * @internal
 */
export function useGridMenuActions<T>({
	contextMenu,
	columnManager,
	resize,
	setSort,
	hasData,
	hasSizingPreference,
}: {
	contextMenu: GridContextMenuConfig<T> | false | undefined
	/**
	 * The `columnManager` prop as passed, `false` and all — the surfaces read the
	 * off switch straight off it. Its visibility bindings are seeded elsewhere;
	 * nothing read here is seeded.
	 */
	columnManager: GridColumnManagerConfig | false | undefined
	resize: GridColumnResize | null
	setSort: (sort: SortState[]) => void
	/** Right-click menus stand down with no source data (its items act on rows). */
	hasData: boolean
	/**
	 * Whether a saved column-width preference is in play. "Auto-size all columns"
	 * then confirms before running — the fit replaces the saved widths — instead
	 * of executing outright.
	 */
	hasSizingPreference: boolean
}) {
	// Context menus are on by default (`false` opts out). With no data they stand
	// down *behaviorally* (`contextMenuEnabled`), never structurally — resolving
	// the config to `undefined` here would unmount the menu wrapper and remount
	// the whole table region when data arrives, tearing the scroll container out
	// from under the virtualizer mid-commit (rows then never render).
	const menu = contextMenu === false ? undefined : (contextMenu ?? DEFAULT_CONTEXT_MENU)

	// `columnManager={false}` is the master off switch, and it carries itself: a
	// manager that isn't configured has no surfaces and no `open` binding either.
	const manager = columnManager || undefined

	const surfaces = columnManager === false ? SURFACES_OFF : resolveToolSurfaces(manager)

	const managerLabel = manager?.label ?? 'Manage columns'

	// Two entry points to the dialog: the opt-in toolbar button, and the header
	// menu's "Manage columns" item — on by default, but only ever shown inside a
	// column menu, so the menu's own switch gates it too.
	const showButton = surfaces.toolbar

	const menuItemReachable = surfaces.contextMenu && Boolean(menu?.column)

	// A host that drives the dialog from its own chrome binds `open` and turns
	// both surfaces off; the dialog still mounts, or the binding would be inert.
	const openBound = manager?.open !== undefined || manager?.defaultOpen !== undefined

	const renderDialog = showButton || menuItemReachable || openBound

	const [open, setOpen] = useControllable<boolean>({
		value: manager?.open,
		defaultValue: manager?.defaultOpen ?? false,
		onValueChange: (next) => manager?.onOpenChange?.(next ?? false),
	})

	// The menu sets a single-column sort, replacing any multi-column sort; Clear
	// sort empties it. (Multi-column sorting is the header Shift-click path.)
	const sortColumn = useCallback(
		(column: string | number, direction: 'asc' | 'desc') => setSort([{ column, direction }]),
		[setSort],
	)

	const clearSort = useCallback(() => setSort([]), [setSort])

	// "Auto-size all columns" replaces any saved widths (the fitted widths persist
	// as the new sizing), so with a sizing preference in play the action detours
	// through a confirmation; without one it runs outright and simply establishes
	// the preference.
	const [autoSizeConfirmOpen, setAutoSizeConfirmOpen] = useState(false)

	const sizeToFit = resize?.sizeToFit ?? null

	const autoSizeColumns = useMemo(() => {
		if (!sizeToFit) return null

		if (!hasSizingPreference) return sizeToFit

		return () => setAutoSizeConfirmOpen(true)
	}, [sizeToFit, hasSizingPreference])

	// Backs the menu's "Manage columns" item (the header menu's and the
	// column-group band's alike); `null` keeps it out. Gated on the menu item
	// rather than on `renderDialog`, so a manager placed on the toolbar alone
	// stays off the menus — and non-null still implies a mounted dialog.
	const chooseColumns = useMemo(
		() => (menuItemReachable ? () => setOpen(true) : null),
		[menuItemReachable, setOpen],
	)

	return {
		contextMenu: menu,
		// Right-click menus stand down with no source data (their items act on rows).
		contextMenuEnabled: hasData,
		renderDialog,
		showButton,
		managerLabel,
		columnManagerOpen: open ?? false,
		setColumnManagerOpen: setOpen,
		sortColumn,
		clearSort,
		// Header "Auto-size all columns" — only when resizing is on; detours
		// through the confirm dialog while a sizing preference is in play.
		autoSizeColumns,
		// The confirm dialog's wiring: open state and the confirmed fit.
		autoSizeConfirmOpen,
		setAutoSizeConfirmOpen,
		confirmAutoSize: sizeToFit,
		// Header "Auto-size this column" — re-fits one column to its content; only
		// when resizing is on.
		autoSizeColumn: resize?.reset ?? null,
		chooseColumns,
	}
}
