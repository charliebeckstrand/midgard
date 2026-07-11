'use client'

import {
	type MouseEvent,
	type ReactNode,
	type RefObject,
	useCallback,
	useMemo,
	useRef,
	useState,
} from 'react'
import { ContextMenuList } from '../../components/context-menu'
import { Menu, MenuContent, useMenuActions } from '../../components/menu'
import { isDataColumn, isNativeContextMenuRequest } from '../../utilities'
import type { SortState } from './context'
import type { GridExportAction } from './engine/grid-export/types'
import {
	openKeyboardMenu,
	resolveTarget,
	tryCellMenu,
	tryColumnGroupMenu,
	tryGroupMenu,
} from './engine/grid-menu-targeting'
import { frozenSide, normalizeFreeze } from './engine/grid-pin/overrides'
import {
	buildColumnGroupMenu,
	cellMenuDefaults,
	columnMenuDefaults,
	copyText,
	type GridGroupByMenu,
	type PinColumn,
	type SortColumn,
} from './grid-context-menu-utilities'
import type { GridColumnGroup } from './grid-group-types'
import type {
	GridCellMenuContext,
	GridColumn,
	GridColumnMenuContext,
	GridContextMenu as GridContextMenuConfig,
	GridMenuItem,
} from './types'

/** Props for {@link GridContextMenu}. @internal */
type GridContextMenuProps<T> = {
	config: GridContextMenuConfig<T>
	/**
	 * Whether right-clicks resolve to a menu at all. When `false` every click
	 * falls through to the native menu — the stand-down for a grid with no data.
	 * A *flag* rather than unmounting this wrapper: the wrapper appearing later
	 * (data arriving) would remount the whole table region, tearing down the
	 * scroll container out from under the virtualizer mid-commit.
	 * @defaultValue true
	 */
	enabled?: boolean
	/** Visible columns, for resolving a right-clicked header/cell to its column. */
	columns: GridColumn<T>[]
	/** Rendered rows, parallel to `rowKeys`, for resolving a cell to its row. */
	rows: T[]
	rowKeys: (string | number)[]
	/** Active sort columns in priority order, so a sorted column's menu offers "Clear sort". */
	sort: SortState[]
	sortColumn: SortColumn
	/** Clears the grid's active sort. */
	clearSort: () => void
	/** Pins the right-clicked column to an edge, or unpins it; backs the menu's Pin items. */
	pinColumn: PinColumn
	/**
	 * The group-by toggle for a right-clicked `groupable` column — the active
	 * grouped column id and the write-back — or `null` when the group button is
	 * off. Backs the menu's "Group by …" / "Ungroup …" item.
	 */
	groupBy: GridGroupByMenu | null
	/** Auto-sizes resizable columns to fill the width, or `null` when the grid is not resizable. */
	autoSizeColumns: (() => void) | null
	/** Re-fits a single column to its content ("Auto-size this column"), or `null` when the grid is not resizable. */
	autoSizeColumn: ((column: string | number) => void) | null
	/** Opens the column-manager dialog ("Manage columns"), or `null` when none is reachable. */
	chooseColumns: (() => void) | null
	/** One action per configured export type; empty when export is off. Shared by the column menu, the cell menu, and the toolbar dropdown. */
	exportActions: GridExportAction[]
	/**
	 * Resolves the group-header menu items for a right-clicked group by its key
	 * (the group's shared value), or `null` when the row manager / grouping isn't
	 * live. Backs the "Manage rows" menu on the group-header row.
	 */
	rowGroupMenu: ((key: string) => GridMenuItem[] | null) | null
	/**
	 * Resolves the column-group band menu for a right-clicked group by its id
	 * (`data-group-id`), or `null` when grouping is off. Backs the badge menu's
	 * Clear color / Manage columns items.
	 */
	columnGroupMenu: ((id: string) => GridMenuItem[] | null) | null
	children: ReactNode
}

/**
 * Resolves the column-group band menu for a right-clicked group by its id, or
 * `null` when grouping is off or the group offers no action. Backs the badge
 * menu's Clear color / Manage columns items; clearing commits the recolored
 * groups through the binding {@link useGridGroup} owns.
 *
 * @internal
 */
export function useColumnGroupMenu(args: {
	groups: GridColumnGroup[]
	setGroups: (groups: GridColumnGroup[]) => void
	/** Whether column groups are configured — off leaves the band inert. */
	enabled: boolean
	/** Opens the column-manager dialog, or `null` when none is reachable. */
	chooseColumns: (() => void) | null
	/** Label for the "Manage columns" item. */
	manageLabel: ReactNode
}): (id: string) => GridMenuItem[] | null {
	const { groups, setGroups, enabled, chooseColumns, manageLabel } = args

	return useCallback(
		(id: string): GridMenuItem[] | null => {
			if (!enabled) return null

			const group = groups.find((candidate) => String(candidate.id) === id)

			if (!group) return null

			const items = buildColumnGroupMenu({
				group,
				onClearColor: () =>
					setGroups(groups.map((g) => (g.id === group.id ? { ...g, color: undefined } : g))),
				chooseColumns,
				manageLabel,
			})

			return items.length > 0 ? items : null
		},
		[groups, setGroups, enabled, chooseColumns, manageLabel],
	)
}

/**
 * Right-click context menus for a {@link Grid}: a single cursor-anchored
 * {@link Menu} wrapping the table region. A right-click on a header (`th`) or
 * data cell (`td`) is resolved to its column and row through the
 * `data-grid-col` / `data-grid-row` attributes, then its items — the grid
 * defaults, optionally reshaped by a `column` / `cell` builder — render. A click
 * that lands on neither leaves the native menu alone.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function GridContextMenu<T>({
	config,
	enabled = true,
	columns,
	rows,
	rowKeys,
	sort,
	sortColumn,
	clearSort,
	pinColumn,
	groupBy,
	autoSizeColumns,
	autoSizeColumn,
	chooseColumns,
	exportActions,
	rowGroupMenu,
	columnGroupMenu,
	children,
}: GridContextMenuProps<T>) {
	const [open, setOpen] = useState(false)

	const [items, setItems] = useState<GridMenuItem[]>([])

	// The grid to restore focus to when a keyboard-opened menu closes; set only on
	// the keyboard path, so a pointer-opened menu leaves focus where the user left it.
	const returnFocus = useRef<HTMLElement | null>(null)

	const columnById = useMemo(
		() => new Map(columns.map((column) => [String(column.id), column])),
		[columns],
	)

	const rowByKey = useMemo(
		() => new Map(rowKeys.map((key, index) => [String(key), rows[index]] as const)),
		[rowKeys, rows],
	)

	const resolveColumnItems = useCallback(
		(columnId: string): GridMenuItem[] | null => {
			if (!config.column) return null

			const column = columnById.get(columnId)

			if (!column) return null

			const sortDirection = sort.find((entry) => entry.column === column.id)?.direction

			const defaults = columnMenuDefaults({
				column,
				sortDirection,
				sortColumn,
				clearSort,
				pinColumn,
				groupBy,
				autoSizeColumns,
				autoSizeColumn,
				chooseColumns,
				exportActions,
			})

			// A boolean `column` opt-in takes the defaults untouched; only a builder
			// function needs the context, so it's built solely on that path.
			if (typeof config.column !== 'function') return defaults

			const context: GridColumnMenuContext<T> = {
				column,
				sortDirection,
				sortAscending: () => sortColumn(column.id, 'asc'),
				sortDescending: () => sortColumn(column.id, 'desc'),
				clearSort,
				pinned: frozenSide(column),
				locked: normalizeFreeze(column.locked),
				pinLeft: () => pinColumn(column.id, 'left'),
				pinRight: () => pinColumn(column.id, 'right'),
				unpin: () => pinColumn(column.id, false),
				autoSizeColumns: autoSizeColumns ?? undefined,
				autoSizeColumn:
					autoSizeColumn && isDataColumn(column) ? () => autoSizeColumn(column.id) : undefined,
				chooseColumns: () => chooseColumns?.(),
				exportActions,
			}

			return config.column(context, defaults)
		},
		[
			config.column,
			columnById,
			sort,
			sortColumn,
			clearSort,
			pinColumn,
			groupBy,
			autoSizeColumns,
			autoSizeColumn,
			chooseColumns,
			exportActions,
		],
	)

	const resolveCellItems = useCallback(
		(columnId: string, rowKey: string, text: string): GridMenuItem[] | null => {
			if (!config.cell) return null

			const column = columnById.get(columnId)

			const row = rowByKey.get(rowKey)

			if (!column || row === undefined) return null

			const value = column.value ? column.value(row) : text

			const copy = () => copyText(value == null ? '' : String(value))

			const defaults = cellMenuDefaults(copy, exportActions)

			// As with columns: the context is built only for a builder function, not
			// the boolean opt-in that takes the defaults as-is.
			if (typeof config.cell !== 'function') return defaults

			const context: GridCellMenuContext<T> = {
				row,
				column,
				value,
				copy,
				exportActions,
			}

			return config.cell(context, defaults)
		},
		[config.cell, columnById, rowByKey, exportActions],
	)

	// `enabled` gates every resolver (a `null` resolution leaves the native menu
	// alone), so a no-data grid stands its menus down without unmounting this
	// wrapper — see the prop's remark.
	const resolveItems = useCallback(
		(target: HTMLElement): GridMenuItem[] | null =>
			enabled ? resolveTarget(target, resolveColumnItems, resolveCellItems) : null,
		[enabled, resolveColumnItems, resolveCellItems],
	)

	// Group-header rows carry their own menu (Manage rows, expand/collapse, color),
	// keyed by the group's shared value; `null` when the row manager isn't live.
	const resolveGroupItems = useCallback(
		(key: string): GridMenuItem[] | null => (enabled && rowGroupMenu ? rowGroupMenu(key) : null),
		[enabled, rowGroupMenu],
	)

	// Column-group band badges carry their own menu (Clear color, Manage columns),
	// keyed by the group's id; `null` when grouping is off.
	const resolveColumnGroupItems = useCallback(
		(id: string): GridMenuItem[] | null =>
			enabled && columnGroupMenu ? columnGroupMenu(id) : null,
		[enabled, columnGroupMenu],
	)

	// Restore focus to the grid when a keyboard-opened menu closes, so the cursor —
	// kept seated by the grid's blur guard — picks up where it left off.
	const handleOpenChange = useCallback((next: boolean) => {
		setOpen(next)

		if (!next && returnFocus.current) {
			returnFocus.current.focus()

			returnFocus.current = null
		}
	}, [])

	return (
		<Menu open={open} onOpenChange={handleOpenChange}>
			<GridContextMenuSurface
				resolveItems={resolveItems}
				resolveGroupItems={resolveGroupItems}
				resolveColumnGroupItems={resolveColumnGroupItems}
				setItems={setItems}
				returnFocus={returnFocus}
			>
				{children}
			</GridContextMenuSurface>

			<MenuContent>
				<ContextMenuList entries={items} />
			</MenuContent>
		</Menu>
	)
}

/**
 * The right-click / keyboard delegation surface, rendered inside {@link Menu} so it
 * can open the menu through the menu's {@link useMenuActions} `openAt`. A
 * `contents` wrapper keeps it out of layout. A right-click resolves the cell or
 * header under the pointer and opens the menu there; the keyboard context-menu
 * (Shift+F10 / the ContextMenu key), which fires on the focused grid rather than a
 * cell, is retargeted to the active cursor cell (WCAG 2.1.1), recording the grid to
 * restore focus to on close. Stops propagation either way so the menu opens once.
 *
 * @internal
 */
function GridContextMenuSurface({
	resolveItems,
	resolveGroupItems,
	resolveColumnGroupItems,
	setItems,
	returnFocus,
	children,
}: {
	resolveItems: (target: HTMLElement) => GridMenuItem[] | null
	resolveGroupItems: (key: string) => GridMenuItem[] | null
	resolveColumnGroupItems: (id: string) => GridMenuItem[] | null
	setItems: (items: GridMenuItem[]) => void
	returnFocus: RefObject<HTMLElement | null>
	children: ReactNode
}) {
	const { openAt } = useMenuActions()

	const handleContextMenu = useCallback(
		(event: MouseEvent<HTMLDivElement>) => {
			// The grid drives the menu through `openAt`; the Menu wrapper must not also
			// fire for the same event.
			event.stopPropagation()

			// Ctrl + secondary-button click yields to the browser's native menu; a
			// Ctrl + primary-button click (macOS's secondary click) falls through to
			// the grid menu instead, so Mac users reach it without a right button
			// (CONT-04). Shared with the {@link Menu} context menu.
			if (isNativeContextMenuRequest(event)) return

			const target = event.target as HTMLElement

			// Opens the menu at a point with the resolved items, suppressing the native
			// menu; an empty/absent set leaves the browser's own menu alone.
			const commit = (items: GridMenuItem[] | null, anchor: HTMLElement, x: number, y: number) => {
				if (!items || items.length === 0) return

				event.preventDefault()

				setItems(items)

				openAt(anchor, x, y)
			}

			// Group-header row, then column-group band, then data cell, then (no cell)
			// the keyboard menu on the focused grid; each consumes the event on a match.
			if (tryGroupMenu(target, event, resolveGroupItems, commit)) return

			if (tryColumnGroupMenu(target, event, resolveColumnGroupItems, commit)) return

			if (tryCellMenu(target, event, resolveItems, commit)) return

			openKeyboardMenu(target, resolveItems, commit, returnFocus)
		},
		[openAt, resolveItems, resolveGroupItems, resolveColumnGroupItems, setItems, returnFocus],
	)

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: a right-click delegation surface, not an interactive control; the floating menu carries the keyboard model
		<div className="contents" onContextMenu={handleContextMenu}>
			{children}
		</div>
	)
}
