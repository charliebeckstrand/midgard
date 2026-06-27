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
import { type MouseEvent, type ReactNode, useCallback, useMemo, useState } from 'react'
import { Icon } from '../../components/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator } from '../../components/menu'
import type { SortState } from './context'
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

/** A column's frozen edge, with `true` collapsed to `'left'`. @internal */
function normalizePinned(
	pinned: boolean | 'left' | 'right' | undefined,
): 'left' | 'right' | undefined {
	if (pinned === 'right') return 'right'

	return pinned ? 'left' : undefined
}

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
	/** Exports the filtered/sorted rows to CSV, or `null` when export is off. */
	exportCsv: (() => void) | null
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
}

/**
 * Pin items for a column's menu: "Pin left" / "Pin right" for the edges it is
 * not already frozen to, and "Unpin" once it is frozen. A scrolling column
 * offers both edges; a left-pinned one offers Pin right and Unpin, and vice
 * versa.
 *
 * @internal
 */
function pinMenuItems<T>(column: GridColumn<T>, pinColumn: PinColumn): GridMenuItem[] {
	const side = normalizePinned(column.pinned)

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
 * left / Pin right / Unpin), an "Auto-size columns" action (when resizing is
 * on), then the table-wide tools — "Manage columns" (when a manager is
 * reachable) and "Export to CSV" (when export is on) — under a separator.
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

	if (autoSizeColumns) {
		items.push({
			key: 'auto-size',
			label: 'Auto-size columns',
			icon: <StretchHorizontal />,
			onSelect: autoSizeColumns,
		})
	}

	// Table-wide tools share a separator from the column's own sort/size actions.
	const tools: GridMenuItem[] = []

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
			label: 'Export to CSV',
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

/** Default cell-menu item: Copy. @internal */
function cellMenuDefaults(copy: () => void): GridMenuItem[] {
	return [{ key: 'copy', label: 'Copy', icon: <Copy />, onSelect: copy }]
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
	children,
}: GridContextMenuProps<T>) {
	const [open, setOpen] = useState(false)

	const [items, setItems] = useState<GridMenuItem[]>([])

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
				pinned: normalizePinned(column.pinned),
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

			const defaults = cellMenuDefaults(copy)

			// As with columns: the context is built only for a builder function, not
			// the boolean opt-in that takes the defaults as-is.
			if (typeof config.cell !== 'function') return defaults

			const context: GridCellMenuContext<T> = { row, column, value, copy }

			return config.cell(context, defaults)
		},
		[config.cell, columnById, rowByKey],
	)

	const handleContextMenu = useCallback(
		(event: MouseEvent<HTMLDivElement>) => {
			// Ctrl held: defer to the browser's standard menu. Stop the event before
			// the Menu wrapper opens the custom one, and leave the default intact.
			if (event.ctrlKey) {
				event.stopPropagation()

				return
			}

			const resolved = resolveTarget(
				event.target as HTMLElement,
				resolveColumnItems,
				resolveCellItems,
			)

			// Nothing to show here: keep the native menu and stop the event before the
			// Menu wrapper's own handler opens an empty surface.
			if (!resolved || resolved.length === 0) {
				event.stopPropagation()

				return
			}

			setItems(resolved)
		},
		[resolveColumnItems, resolveCellItems],
	)

	return (
		<Menu open={open} onOpenChange={setOpen}>
			{/*
			 * `contents` keeps this wrapper out of layout; it records the right-clicked
			 * target, then lets the event bubble to the Menu wrapper, which opens at
			 * the cursor. It implements no keyboard model of its own — the menu does.
			 */}
			{/* biome-ignore lint/a11y/noStaticElementInteractions: a right-click delegation surface, not an interactive control; the floating menu carries the keyboard model */}
			<div className="contents" onContextMenu={handleContextMenu}>
				{children}
			</div>

			<MenuContent>{items.map(renderMenuItem)}</MenuContent>
		</Menu>
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
