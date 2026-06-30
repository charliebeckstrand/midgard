'use client'

import {
	ArrowDown,
	ArrowLeftToLine,
	ArrowRightToLine,
	ArrowUp,
	ArrowUpDown,
	Columns3,
	Copy,
	Download,
	PinOff,
	StretchHorizontal,
} from 'lucide-react'
import {
	type MouseEvent,
	type ReactNode,
	type RefObject,
	useCallback,
	useMemo,
	useRef,
	useState,
} from 'react'
import { Icon } from '../../components/icon'
import {
	Menu,
	MenuContent,
	MenuItem,
	MenuLabel,
	MenuSeparator,
	useMenuActions,
} from '../../components/menu'
import type { SortState } from './context'
import { frozenSide, isLocked, normalizeFreeze } from './grid-pin-overrides'
import type {
	GridCellMenuContext,
	GridColumn,
	GridColumnMenuContext,
	GridContextMenu as GridContextMenuConfig,
	GridMenuItem,
} from './types'

/** Sets the sort to a column in a fixed direction. @internal */
type SortColumn = (column: string | number, direction: 'asc' | 'desc') => void

/** Pins a column to an edge, or unpins it with `false`. @internal */
type PinColumn = (column: string | number, side: 'left' | 'right' | false) => void

/** Props for {@link GridContextMenu}. @internal */
type GridContextMenuProps<T> = {
	config: GridContextMenuConfig<T>
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
	/** Auto-sizes resizable columns to fill the width, or `null` when the grid is not resizable. */
	autoSizeColumns: (() => void) | null
	/** Opens the column-manager dialog ("Manage columns"), or `null` when none is reachable. */
	chooseColumns: (() => void) | null
	/** Exports to CSV — the selected rows when a selection is active, else the filtered/sorted set — or `null` when export is off. Shared by the column menu, the cell menu, and the toolbar button. */
	exportCsv: (() => void) | null
	/** Label on the "Export to CSV" item, shared with the export toolbar button. */
	exportLabel: ReactNode
	children: ReactNode
}

/** Writes text to the clipboard when the API is available. @internal */
function copyText(text: string): void {
	navigator.clipboard?.writeText(text)
}

/** Inputs shaping the default header-menu items. @internal */
type ColumnMenuDefaultArgs<T> = {
	column: GridColumn<T>
	/** This column's active sort direction, or `undefined` when it is not the sorted column. */
	sortDirection: 'asc' | 'desc' | undefined
	sortColumn: SortColumn
	clearSort: () => void
	pinColumn: PinColumn
	autoSizeColumns: (() => void) | null
	chooseColumns: (() => void) | null
	exportCsv: (() => void) | null
	/** Label on the "Export to CSV" item, shared with the export toolbar button. */
	exportLabel: ReactNode
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
 * "Clear sort" once it is the sorted column and the column's pin controls (Pin
 * left / Pin right / Unpin), then the table-wide tools under a separator —
 * "Auto-size columns" (when resizing is on), "Manage columns" (when a manager is
 * reachable), and "Export to CSV" (when export is on).
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
		autoSizeColumns,
		chooseColumns,
		exportCsv,
		exportLabel,
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

	// Table-wide tools sit under a separator, set off from the clicked column's
	// own sort and pin actions. "Auto-size columns" leads them: it re-fits every
	// column, not just the one clicked, so it belongs with the grid-wide tools
	// rather than the column's actions above.
	const tools: GridMenuItem[] = []

	if (autoSizeColumns) {
		tools.push({
			key: 'auto-size',
			label: 'Auto-size columns',
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

	if (exportCsv) {
		tools.push({
			key: 'export-csv',
			label: exportLabel,
			icon: <Download />,
			onSelect: exportCsv,
		})
	}

	if (tools.length > 0) {
		if (items.length > 0) items.push({ key: 'tools-separator', separator: true })

		items.push(...tools)
	}

	return items
}

/**
 * Default cell-menu items: Copy, then — when export is on — "Export to CSV" under
 * a separator. Copy acts on the right-clicked cell; export is a grid-wide tool
 * (scoped to the selection when rows are selected), so it sits apart below the
 * divider, mirroring the column menu's grouping of its table-wide tools.
 *
 * @internal
 */
function cellMenuDefaults(
	copy: () => void,
	exportCsv: (() => void) | null,
	exportLabel: ReactNode,
): GridMenuItem[] {
	const items: GridMenuItem[] = [{ key: 'copy', label: 'Copy', icon: <Copy />, onSelect: copy }]

	if (exportCsv) {
		items.push(
			{ key: 'export-separator', separator: true },
			{ key: 'export-csv', label: exportLabel, icon: <Download />, onSelect: exportCsv },
		)
	}

	return items
}

/** Renders one {@link GridMenuItem} as a menu item or separator. @internal */
function renderMenuItem(item: GridMenuItem): ReactNode {
	if ('separator' in item) return <MenuSeparator key={item.key} />

	return (
		<MenuItem key={item.key} onAction={item.onSelect} disabled={item.disabled}>
			{item.icon ? <Icon icon={item.icon} /> : null}
			<MenuLabel>{item.label}</MenuLabel>
		</MenuItem>
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
	columns,
	rows,
	rowKeys,
	sort,
	sortColumn,
	clearSort,
	pinColumn,
	autoSizeColumns,
	chooseColumns,
	exportCsv,
	exportLabel,
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
				autoSizeColumns,
				chooseColumns,
				exportCsv,
				exportLabel,
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
				chooseColumns: () => chooseColumns?.(),
				exportCsv: exportCsv ?? undefined,
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
			autoSizeColumns,
			chooseColumns,
			exportCsv,
			exportLabel,
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

			const defaults = cellMenuDefaults(copy, exportCsv, exportLabel)

			// As with columns: the context is built only for a builder function, not
			// the boolean opt-in that takes the defaults as-is.
			if (typeof config.cell !== 'function') return defaults

			const context: GridCellMenuContext<T> = {
				row,
				column,
				value,
				copy,
				exportCsv: exportCsv ?? undefined,
			}

			return config.cell(context, defaults)
		},
		[config.cell, columnById, rowByKey, exportCsv, exportLabel],
	)

	const resolveItems = useCallback(
		(target: HTMLElement): GridMenuItem[] | null =>
			resolveTarget(target, resolveColumnItems, resolveCellItems),
		[resolveColumnItems, resolveCellItems],
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
				setItems={setItems}
				returnFocus={returnFocus}
			>
				{children}
			</GridContextMenuSurface>

			<MenuContent>{items.map(renderMenuItem)}</MenuContent>
		</Menu>
	)
}

/**
 * Whether the runtime is an Apple platform, where Ctrl+click is the standard
 * secondary click rather than a modifier on a primary click. Read at event time
 * (client only); falls back to the user-agent string where `platform` is absent.
 *
 * @internal
 */
function isApplePlatform(): boolean {
	if (typeof navigator === 'undefined') return false

	return /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent)
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
	setItems,
	returnFocus,
	children,
}: {
	resolveItems: (target: HTMLElement) => GridMenuItem[] | null
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

			// Ctrl held on a non-Apple platform: defer to the browser's standard menu,
			// default intact. On macOS Ctrl+click IS the secondary click, so it must
			// open the grid menu rather than be swallowed by this escape hatch (CONT-04).
			if (event.ctrlKey && !isApplePlatform()) return

			const target = event.target as HTMLElement

			const cell = target.closest<HTMLElement>('td[data-grid-col], th[data-grid-col]')

			if (cell) {
				const items = resolveItems(cell)

				if (!items || items.length === 0) return

				event.preventDefault()

				setItems(items)

				openAt(target, event.clientX, event.clientY)

				return
			}

			// No cell under the event: a keyboard context menu on the focused grid.
			// Retarget to the active cursor cell and open there.
			const grid = target.closest<HTMLElement>('[role="grid"]')

			const active = grid?.querySelector<HTMLElement>('[data-active]')

			if (!active) return

			const items = resolveItems(active)

			if (!items || items.length === 0) return

			event.preventDefault()

			setItems(items)

			returnFocus.current = grid

			const rect = active.getBoundingClientRect()

			openAt(active, rect.left, rect.bottom)
		},
		[openAt, resolveItems, setItems, returnFocus],
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
