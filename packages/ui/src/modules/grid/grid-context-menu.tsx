'use client'

import {
	ArrowDown,
	ArrowLeftToLine,
	ArrowRightToLine,
	ArrowUp,
	ArrowUpDown,
	Ban,
	Columns3,
	Copy,
	Download,
	Group,
	MoveHorizontal,
	PinOff,
	Printer,
	StretchHorizontal,
	Ungroup,
} from 'lucide-react'
import {
	type MouseEvent,
	type ReactElement,
	type ReactNode,
	type RefObject,
	useCallback,
	useMemo,
	useRef,
	useState,
} from 'react'
import { ContextMenuList } from '../../components/context-menu'
import { Menu, MenuContent, useMenuActions } from '../../components/menu'
import { isDataColumn } from '../../utilities'
import type { SortState } from './context'
import type { GridExportAction } from './export/types'
import type { GridColumnGroup } from './grid-group-types'
import { frozenSide, isLocked, normalizeFreeze } from './grid-pin-overrides'
import {
	columnLabel,
	type GridCellMenuContext,
	type GridColumn,
	type GridColumnMenuContext,
	type GridContextMenu as GridContextMenuConfig,
	type GridMenuItem,
} from './types'

/** Menu-item icon for an export action: a printer for `print`, a download glyph otherwise. @internal */
function exportIcon(type: GridExportAction['type']): ReactElement {
	return type === 'print' ? <Printer /> : <Download />
}

/** Maps active export actions to menu items — the shape the column and cell menus each append. @internal */
function exportMenuItems(exportActions: GridExportAction[]): GridMenuItem[] {
	return exportActions.map((action) => ({
		key: `export-${action.type}`,
		label: action.label,
		icon: exportIcon(action.type),
		onSelect: action.run,
	}))
}

/** Sets the sort to a column in a fixed direction. @internal */
type SortColumn = (column: string | number, direction: 'asc' | 'desc') => void

/** Pins a column to an edge, or unpins it with `false`. @internal */
type PinColumn = (column: string | number, side: 'left' | 'right' | false) => void

/**
 * The group-by toggle a `groupable` column's header menu offers: the active
 * grouped column id and the write-back that groups by a column (or `null` to
 * ungroup). `null` at the call site turns the menu's group item off.
 *
 * @internal
 */
type GridGroupByMenu = {
	/** The active grouped column id, or `null` when ungrouped. */
	grouping: (string | number) | null
	/** Groups by a column, or ungroups with `null` — through the `groupBy` binding. */
	setGrouping: (next: (string | number) | null) => void
}

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

/** Writes text to the clipboard when the API is available. @internal */
function copyText(text: string): void {
	// Swallow a rejected write (a denied permission, an unfocused document): the
	// copy silently no-ops rather than surfacing an unhandled rejection, matching
	// the fire-and-forget intent — there's no copy-failed affordance to drive. The
	// optional chain short-circuits the whole expression when the API is absent, so
	// `.catch` is never reached on a nullish clipboard.
	navigator.clipboard?.writeText(text).catch(() => {})
}

/** Inputs shaping the default header-menu items. @internal */
type ColumnMenuDefaultArgs<T> = {
	column: GridColumn<T>
	/** This column's active sort direction, or `undefined` when it is not the sorted column. */
	sortDirection: 'asc' | 'desc' | undefined
	sortColumn: SortColumn
	clearSort: () => void
	pinColumn: PinColumn
	/** The group-by toggle, or `null` when the group button is off. */
	groupBy: GridGroupByMenu | null
	autoSizeColumns: (() => void) | null
	/** Re-fits a single column to its content, or `null` when the grid is not resizable. */
	autoSizeColumn: ((column: string | number) => void) | null
	chooseColumns: (() => void) | null
	exportActions: GridExportAction[]
}

/**
 * The group item for a column's menu: "Group by {column}" on an ungrouped
 * groupable column (naming the column dynamically), flipping to a plain
 * "Ungroup" once it is the active group — single-level, so only one column is
 * ever grouped. The header button's toggle as a menu action. Empty when the
 * group button is off or the column isn't groupable.
 *
 * @internal
 */
function groupMenuItems<T>(column: GridColumn<T>, groupBy: GridGroupByMenu | null): GridMenuItem[] {
	if (!groupBy || !column.groupable) return []

	if (column.id === groupBy.grouping) {
		return [
			{
				key: 'ungroup',
				label: 'Ungroup',
				icon: <Ungroup />,
				onSelect: () => groupBy.setGrouping(null),
			},
		]
	}

	return [
		{
			key: 'group-by',
			label: `Group by ${columnLabel(column)}`,
			icon: <Group />,
			onSelect: () => groupBy.setGrouping(column.id),
		},
	]
}

/**
 * Pin items for a column's menu: "Pin left" / "Pin right" for the edges it is
 * not already frozen to, and "Unpin" once it is frozen. A scrolling column
 * offers both edges; a left-pinned one offers Pin right and Unpin, and vice
 * versa. A locked column offers none — its freeze is immutable.
 *
 * @internal
 */
function pinMenuItems<T>(column: GridColumn<T>, pinColumn: PinColumn): GridMenuItem[] {
	if (isLocked(column)) return []

	const side = normalizeFreeze(column.pinned)

	const items: GridMenuItem[] = []

	if (side !== 'left') {
		items.push({
			key: 'pin-left',
			label: 'Pin left',
			icon: <ArrowLeftToLine />,
			onSelect: () => pinColumn(column.id, 'left'),
		})
	}

	if (side !== 'right') {
		items.push({
			key: 'pin-right',
			label: 'Pin right',
			icon: <ArrowRightToLine />,
			onSelect: () => pinColumn(column.id, 'right'),
		})
	}

	if (side) {
		items.push({
			key: 'unpin',
			label: 'Unpin',
			icon: <PinOff />,
			onSelect: () => pinColumn(column.id, false),
		})
	}

	return items
}

/**
 * Default header-menu items: sort controls (when the column sorts) with a
 * "Clear sort" once it is the sorted column, the column's pin controls (Pin
 * left / Pin right / Unpin), the group-by toggle (when the column is groupable
 * and the group button is on), and "Auto-size this column" (when resizing is on
 * and the column carries data) closing out the column's own actions, then the
 * table-wide tools under a separator — "Auto-size all columns" (when resizing is
 * on), "Manage columns" (when a manager is reachable), and one item per active
 * export type (when export is on).
 *
 * @internal
 */
function columnMenuDefaults<T>(args: ColumnMenuDefaultArgs<T>): GridMenuItem[] {
	const {
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
	} = args

	const items: GridMenuItem[] = []

	if (column.sortable !== false) {
		items.push(
			{
				key: 'sort-asc',
				label: 'Sort ascending',
				icon: <ArrowUp />,
				onSelect: () => sortColumn(column.id, 'asc'),
			},
			{
				key: 'sort-desc',
				label: 'Sort descending',
				icon: <ArrowDown />,
				onSelect: () => sortColumn(column.id, 'desc'),
			},
		)

		if (sortDirection) {
			items.push({
				key: 'clear-sort',
				label: 'Clear sort',
				icon: <ArrowUpDown />,
				onSelect: clearSort,
			})
		}
	}

	// Pin controls sit with the column's own actions, above the table-wide tools.
	items.push(...pinMenuItems(column, pinColumn))

	// Grouping follows the pin controls.
	items.push(...groupMenuItems(column, groupBy))

	// "Auto-size this column" closes out the column's own actions: a per-column
	// fit sitting alongside sort, pin, and group, distinct from the grid-wide
	// "Auto-size all columns" below the separator. Only a resizable data column
	// offers it — a selection or actions column has no content to fit.
	if (autoSizeColumn && isDataColumn(column)) {
		items.push({
			key: 'auto-size-column',
			label: 'Auto-size this column',
			icon: <MoveHorizontal />,
			onSelect: () => autoSizeColumn(column.id),
		})
	}

	// Table-wide tools sit under a separator, set off from the clicked column's
	// own actions. "Auto-size all columns" leads them: it re-fits every column,
	// not just the one clicked, so it belongs with the grid-wide tools rather
	// than the column's actions above.
	const tools: GridMenuItem[] = []

	if (autoSizeColumns) {
		tools.push({
			key: 'auto-size',
			label: 'Auto-size all columns',
			icon: <StretchHorizontal />,
			onSelect: autoSizeColumns,
		})
	}

	if (chooseColumns) {
		tools.push({
			key: 'choose-columns',
			label: 'Manage columns',
			icon: <Columns3 />,
			onSelect: chooseColumns,
		})
	}

	tools.push(...exportMenuItems(exportActions))

	if (tools.length > 0) {
		if (items.length > 0) items.push({ key: 'tools-separator', separator: true })

		items.push(...tools)
	}

	return items
}

/**
 * Default cell-menu items: Copy, then — when export is on — one item per
 * active export type under a separator. Copy acts on the right-clicked cell;
 * export is a grid-wide tool (scoped to the selection when rows are selected),
 * so it sits apart below the divider, mirroring the column menu's grouping of
 * its table-wide tools.
 *
 * @internal
 */
function cellMenuDefaults(copy: () => void, exportActions: GridExportAction[]): GridMenuItem[] {
	const items: GridMenuItem[] = [{ key: 'copy', label: 'Copy', icon: <Copy />, onSelect: copy }]

	if (exportActions.length > 0) {
		items.push({ key: 'export-separator', separator: true }, ...exportMenuItems(exportActions))
	}

	return items
}

/**
 * The column-group band's context menu (right-clicking the group's badge):
 * "Manage columns" when the column manager is reachable, then — under a
 * separator — "Clear color" at the bottom when the group carries one. Empty when
 * neither applies, so the surface leaves the native menu alone.
 *
 * @internal
 */
function buildColumnGroupMenu(args: {
	group: GridColumnGroup
	onClearColor: () => void
	chooseColumns: (() => void) | null
	manageLabel: ReactNode
}): GridMenuItem[] {
	const items: GridMenuItem[] = []

	if (args.chooseColumns) {
		items.push({
			key: 'manage-columns',
			label: args.manageLabel,
			icon: <Columns3 />,
			onSelect: args.chooseColumns,
		})
	}

	if (args.group.color) {
		// Clear color sits at the bottom, set off by a separator from Manage columns.
		if (items.length > 0) items.push({ key: 'color-separator', separator: true })

		items.push({
			key: 'clear-color',
			label: 'Clear color',
			icon: <Ban />,
			onSelect: args.onClearColor,
		})
	}

	return items
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

/** Opens the menu with a point's resolved items; an empty/absent set no-ops. @internal */
type CommitMenu = (items: GridMenuItem[] | null, anchor: HTMLElement, x: number, y: number) => void

/**
 * Handles a right-click that landed on a group-header row: resolves its menu by
 * the group's shared value (`data-group-key`) and opens it at the pointer.
 * Returns whether the target was a group row — checked first, since a group
 * header's aggregate cells carry `data-grid-col` but aren't ordinary body cells,
 * and its label cell carries none at all.
 *
 * @internal
 */
function tryGroupMenu(
	target: HTMLElement,
	event: MouseEvent<HTMLDivElement>,
	resolveGroupItems: (key: string) => GridMenuItem[] | null,
	commit: CommitMenu,
): boolean {
	const groupRow = target.closest<HTMLElement>('tr[data-group-row]')

	if (groupRow?.dataset.groupKey === undefined) return false

	commit(resolveGroupItems(groupRow.dataset.groupKey), target, event.clientX, event.clientY)

	return true
}

/**
 * Handles a right-click that landed on a column-group band cell (its badge):
 * resolves its menu by the group's id (`data-group-id`) and opens it at the
 * pointer. Returns whether the target was a band cell — checked before the plain
 * cell path, since a band cell carries no `data-grid-col`.
 *
 * @internal
 */
function tryColumnGroupMenu(
	target: HTMLElement,
	event: MouseEvent<HTMLDivElement>,
	resolveColumnGroupItems: (id: string) => GridMenuItem[] | null,
	commit: CommitMenu,
): boolean {
	const band = target.closest<HTMLElement>('th[data-group-band]')

	if (band?.dataset.groupId === undefined) return false

	commit(resolveColumnGroupItems(band.dataset.groupId), target, event.clientX, event.clientY)

	return true
}

/**
 * Handles a right-click that landed on a header or data cell: resolves its
 * column/cell menu and opens it at the pointer. Returns whether the target was a
 * cell.
 *
 * @internal
 */
function tryCellMenu(
	target: HTMLElement,
	event: MouseEvent<HTMLDivElement>,
	resolveItems: (target: HTMLElement) => GridMenuItem[] | null,
	commit: CommitMenu,
): boolean {
	const cell = target.closest<HTMLElement>('td[data-grid-col], th[data-grid-col]')

	if (!cell) return false

	commit(resolveItems(cell), target, event.clientX, event.clientY)

	return true
}

/**
 * Handles a keyboard context menu (Shift+F10 / the ContextMenu key), which fires
 * on the focused grid rather than a cell: retargets to the active cursor cell,
 * records the grid to restore focus to on close, and opens below the cell
 * (WCAG 2.1.1). No-ops when no cell is active.
 *
 * @internal
 */
function openKeyboardMenu(
	target: HTMLElement,
	resolveItems: (target: HTMLElement) => GridMenuItem[] | null,
	commit: CommitMenu,
	returnFocus: RefObject<HTMLElement | null>,
): void {
	const grid = target.closest<HTMLElement>('[role="grid"]')

	const active = grid?.querySelector<HTMLElement>('[data-active]')

	if (!active) return

	const items = resolveItems(active)

	if (!items || items.length === 0) return

	returnFocus.current = grid

	const rect = active.getBoundingClientRect()

	commit(items, active, rect.left, rect.bottom)
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

			// Ctrl + a secondary-button click (`button === 2`) is the escape hatch to the
			// browser's native menu, on every platform. A Ctrl + primary-button click
			// (`button === 0`) — macOS's secondary click — falls through to the grid menu
			// instead, so Mac users reach it without a right button (CONT-04). The two
			// only differ by button, not platform, so no platform sniff is needed.
			if (event.ctrlKey && event.button === 2) return

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

/**
 * Resolves a right-click to its header or cell menu items, or `null` when it hit
 * neither a header nor a data cell.
 *
 * @internal
 */
function resolveTarget(
	target: HTMLElement,
	resolveColumn: (columnId: string) => GridMenuItem[] | null,
	resolveCell: (columnId: string, rowKey: string, text: string) => GridMenuItem[] | null,
): GridMenuItem[] | null {
	const th = target.closest<HTMLElement>('th[data-grid-col]')

	if (th?.dataset.gridCol !== undefined) return resolveColumn(th.dataset.gridCol)

	const td = target.closest<HTMLElement>('td[data-grid-col]')

	if (td?.dataset.gridCol === undefined) return null

	const rowKey = td.closest<HTMLElement>('tr[data-grid-row]')?.dataset.gridRow

	if (rowKey === undefined) return null

	return resolveCell(td.dataset.gridCol, rowKey, td.textContent ?? '')
}
