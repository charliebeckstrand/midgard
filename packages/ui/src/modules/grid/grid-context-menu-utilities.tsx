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
	Pin,
	PinOff,
	Printer,
	StretchHorizontal,
	Ungroup,
} from 'lucide-react'
import type { ReactElement, ReactNode } from 'react'
import { mergeContextMenuItems } from '../../components/context-menu'
import { isDataColumn } from '../../utilities'
import { columnLabel } from './engine/grid-column/label'
import type { GridExportAction } from './engine/grid-export/types'
import {
	isLocked,
	normalizeFreeze,
	type PinMenuChoice,
	pinMenuChoices,
} from './engine/grid-pin/overrides'
import type { GridColumnGroup } from './grid-group-types'
import type { GridColumn, GridMenuItem } from './types'

/** Menu-item icon for an export action: a printer for `print`, a download glyph otherwise. @internal */
function exportIcon(type: GridExportAction['type']): ReactElement {
	return type === 'print' ? <Printer /> : <Download />
}

/** Maps active export actions to menu items — the rows the Export submenu holds in the column and cell menus. @internal */
function exportMenuItems(exportActions: GridExportAction[]): GridMenuItem[] {
	return exportActions.map((action) => ({
		key: `export-${action.type}`,
		label: action.label,
		icon: exportIcon(action.type),
		onSelect: action.run,
	}))
}

/**
 * Collapses a group of related rows under one parent that opens them on hover
 * — the Sort / Pin / Export / Auto-size menus a grid's context menu is built
 * from. A lone row needs no parent to disambiguate it and renders in place
 * (a grid exporting one format offers "Export to CSV" outright, not an Export
 * menu holding it); an empty group contributes nothing.
 *
 * @returns The rows to splice into the menu: one submenu entry, the lone item,
 * or nothing.
 * @internal
 */
function submenuItems(args: {
	key: string
	label: string
	icon: ReactElement
	items: GridMenuItem[]
}): GridMenuItem[] {
	const { key, label, icon, items } = args

	if (items.length < 2) return items

	return [{ key, label, icon, items }]
}

/**
 * The sort rows for a column's menu: "Sort ascending" / "Sort descending", plus
 * "Clear sort" once the column carries the active sort. Empty when the column
 * doesn't sort, which withholds the Sort menu entirely.
 *
 * @internal
 */
function sortMenuItems<T>(args: {
	column: GridColumn<T>
	sortDirection: 'asc' | 'desc' | undefined
	sortColumn: SortColumn
	clearSort: () => void
}): GridMenuItem[] {
	const { column, sortDirection, sortColumn, clearSort } = args

	if (column.sortable === false) return []

	const items: GridMenuItem[] = [
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
	]

	if (sortDirection) {
		items.push({
			key: 'clear-sort',
			label: 'Clear sort',
			icon: <ArrowUpDown />,
			onSelect: clearSort,
		})
	}

	return items
}

/**
 * The auto-size rows for a column's menu: "Auto-size this column" — a
 * per-column fit, offered only on a resizable data column, since a selection or
 * actions column has no content to fit — then the grid-wide "Auto-size all
 * columns". Empty when the grid is not resizable.
 *
 * @internal
 */
function autoSizeMenuItems<T>(args: {
	column: GridColumn<T>
	autoSizeColumn: ((column: string | number) => void) | null
	autoSizeColumns: (() => void) | null
}): GridMenuItem[] {
	const { column, autoSizeColumn, autoSizeColumns } = args

	const items: GridMenuItem[] = []

	if (autoSizeColumn && isDataColumn(column)) {
		items.push({
			key: 'auto-size-column',
			label: 'Auto-size this column',
			icon: <MoveHorizontal />,
			onSelect: () => autoSizeColumn(column.id),
		})
	}

	if (autoSizeColumns) {
		items.push({
			key: 'auto-size',
			label: 'Auto-size all columns',
			icon: <StretchHorizontal />,
			onSelect: autoSizeColumns,
		})
	}

	return items
}

/** Sets the sort to a column in a fixed direction. @internal */
export type SortColumn = (column: string | number, direction: 'asc' | 'desc') => void

/** Pins a column to an edge, or unpins it with `false`. @internal */
export type PinColumn = (column: string | number, side: 'left' | 'right' | false) => void

/**
 * The group-by toggle a `groupable` column's header menu offers: the active
 * grouped column id and the write-back that groups by a column (or `null` to
 * ungroup). `null` at the call site turns the menu's group item off.
 *
 * @internal
 */
export type GridGroupByMenu = {
	/** The active grouped column id, or `null` when ungrouped. */
	grouping: (string | number) | null
	/** Groups by a column, or ungroups with `null` — through the `groupBy` binding. */
	setGrouping: (next: (string | number) | null) => void
}

/** Writes text to the clipboard when the API is available. @internal */
export function copyText(text: string): void {
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

	return pinMenuChoices(normalizeFreeze(column.pinned)).map((choice) => ({
		key: choice.key,
		label: choice.label,
		icon: pinChoiceIcon(choice.key),
		onSelect: () => pinColumn(column.id, choice.target),
	}))
}

/** The glyph for each pin choice — icons stay in the shell, off the engine's decision tree. @internal */
export function pinChoiceIcon(key: PinMenuChoice['key']): ReactElement {
	if (key === 'pin-left') return <ArrowLeftToLine />

	return key === 'pin-right' ? <ArrowRightToLine /> : <PinOff />
}

/**
 * Default header-menu items, consolidated into hover-opened submenus so the
 * menu opens one row per concern rather than a dozen flat actions: Sort (the
 * sort controls, with "Clear sort" once the column is the sorted one), Pin (Pin
 * left / Pin right / Unpin), the group-by toggle — a single action, so it stays
 * a plain row — and Auto-size (this column, then all columns), then the
 * table-wide tools under a separator: "Manage columns" (when a manager is
 * reachable) and Export (one row per active export type).
 *
 * @remarks Each menu withholds itself when it has nothing to offer — a locked
 * column shows no Pin, an unsortable one no Sort — and collapses to a plain row
 * when it holds a single action, so no submenu ever opens onto one item.
 * @internal
 */
export function columnMenuDefaults<T>(args: ColumnMenuDefaultArgs<T>): GridMenuItem[] {
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

	// The clicked column's own actions, in the order the header reads them:
	// sort, pin, group, then the fit that closes them out.
	const actions: GridMenuItem[] = [
		...submenuItems({
			key: 'sort',
			label: 'Sort',
			icon: <ArrowUpDown />,
			items: sortMenuItems({ column, sortDirection, sortColumn, clearSort }),
		}),
		...submenuItems({
			key: 'pin',
			label: 'Pin',
			icon: <Pin />,
			items: pinMenuItems(column, pinColumn),
		}),
		...groupMenuItems(column, groupBy),
		...submenuItems({
			key: 'auto-size-menu',
			label: 'Auto-size',
			icon: <StretchHorizontal />,
			items: autoSizeMenuItems({ column, autoSizeColumn, autoSizeColumns }),
		}),
	]

	// Table-wide tools sit under a separator, set off from the clicked column's
	// own actions above.
	const tools: GridMenuItem[] = []

	if (chooseColumns) {
		tools.push({
			key: 'choose-columns',
			label: 'Manage columns',
			icon: <Columns3 />,
			onSelect: chooseColumns,
		})
	}

	tools.push(
		...submenuItems({
			key: 'export',
			label: 'Export',
			icon: <Download />,
			items: exportMenuItems(exportActions),
		}),
	)

	return mergeContextMenuItems([actions, tools])
}

/**
 * Default cell-menu items: Copy, then — when export is on — the Export submenu
 * under a separator. Copy acts on the right-clicked cell; export is a grid-wide
 * tool (scoped to the selection when rows are selected), so it sits apart below
 * the divider, mirroring the column menu's grouping of its table-wide tools.
 *
 * @internal
 */
export function cellMenuDefaults(
	copy: () => void,
	exportActions: GridExportAction[],
): GridMenuItem[] {
	const copyItem: GridMenuItem = { key: 'copy', label: 'Copy', icon: <Copy />, onSelect: copy }

	const exports = submenuItems({
		key: 'export',
		label: 'Export',
		icon: <Download />,
		items: exportMenuItems(exportActions),
	})

	return mergeContextMenuItems([[copyItem], exports])
}

/**
 * The column-group band's context menu (right-clicking the group's badge):
 * "Manage columns" when the column manager is reachable, then — under a
 * separator — "Clear color" at the bottom when the group carries one. Empty when
 * neither applies, so the surface leaves the native menu alone.
 *
 * @internal
 */
export function buildColumnGroupMenu(args: {
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
