'use client'

import { ArrowDown, ArrowUp, ArrowUpDown, Columns3, Copy, StretchHorizontal } from 'lucide-react'
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

/** Props for {@link GridContextMenu}. @internal */
type GridContextMenuProps<T> = {
	config: GridContextMenuConfig<T>
	/** Visible columns, for resolving a right-clicked header/cell to its column. */
	columns: GridColumn<T>[]
	/** Rendered rows, parallel to `rowKeys`, for resolving a cell to its row. */
	rows: T[]
	rowKeys: (string | number)[]
	/** Active sort, so a sorted column's menu offers "Clear sort". */
	sort: SortState | undefined
	sortColumn: SortColumn
	/** Clears the grid's active sort. */
	clearSort: () => void
	/** Auto-sizes resizable columns to fill the width, or `null` when the grid is not resizable. */
	autoSizeColumns: (() => void) | null
	/** Opens the column-manager dialog ("Choose Columns"), or `null` when none is reachable. */
	chooseColumns: (() => void) | null
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
	autoSizeColumns: (() => void) | null
	chooseColumns: (() => void) | null
}

/**
 * Default header-menu items: sort controls (when the column sorts) with a
 * "Clear sort" once it is the sorted column, an "Auto-size columns" action
 * (when resizing is on), then "Choose Columns" (when a manager is reachable).
 *
 * @internal
 */
function columnMenuDefaults<T>(args: ColumnMenuDefaultArgs<T>): GridMenuItem[] {
	const { column, sortDirection, sortColumn, clearSort, autoSizeColumns, chooseColumns } = args

	const items: GridMenuItem[] = []

	if (column.sortable !== false) {
		items.push(
			{
				key: 'sort-asc',
				label: 'Sort Ascending',
				icon: <ArrowUp />,
				onSelect: () => sortColumn(column.id, 'asc'),
			},
			{
				key: 'sort-desc',
				label: 'Sort Descending',
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

	if (autoSizeColumns) {
		items.push({
			key: 'auto-size',
			label: 'Auto-size columns',
			icon: <StretchHorizontal />,
			onSelect: autoSizeColumns,
		})
	}

	if (chooseColumns) {
		if (items.length > 0) items.push({ key: 'choose-columns-separator', separator: true })

		items.push({
			key: 'choose-columns',
			label: 'Choose Columns',
			icon: <Columns3 />,
			onSelect: chooseColumns,
		})
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
	autoSizeColumns,
	chooseColumns,
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

			const sortDirection = sort?.column === column.id ? sort.direction : undefined

			const context: GridColumnMenuContext<T> = {
				column,
				sortDirection,
				sortAscending: () => sortColumn(column.id, 'asc'),
				sortDescending: () => sortColumn(column.id, 'desc'),
				clearSort,
				autoSizeColumns: autoSizeColumns ?? undefined,
				chooseColumns: () => chooseColumns?.(),
			}

			const defaults = columnMenuDefaults({
				column,
				sortDirection,
				sortColumn,
				clearSort,
				autoSizeColumns,
				chooseColumns,
			})

			return typeof config.column === 'function' ? config.column(context, defaults) : defaults
		},
		[config.column, columnById, sort, sortColumn, clearSort, autoSizeColumns, chooseColumns],
	)

	const resolveCellItems = useCallback(
		(columnId: string, rowKey: string, text: string): GridMenuItem[] | null => {
			if (!config.cell) return null

			const column = columnById.get(columnId)

			const row = rowByKey.get(rowKey)

			if (!column || row === undefined) return null

			const value = column.value ? column.value(row) : text

			const copy = () => copyText(value == null ? '' : String(value))

			const context: GridCellMenuContext<T> = { row, column, value, copy }

			const defaults = cellMenuDefaults(copy)

			return typeof config.cell === 'function' ? config.cell(context, defaults) : defaults
		},
		[config.cell, columnById, rowByKey],
	)

	const handleContextMenu = useCallback(
		(event: MouseEvent<HTMLDivElement>) => {
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
