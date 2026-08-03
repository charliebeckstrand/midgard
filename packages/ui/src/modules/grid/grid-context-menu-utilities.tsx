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
	ListFilter,
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

/**
 * Maps active export actions to menu items — the rows the Export submenu holds
 * in the column and cell menus, and the same rows a menu hosted *outside* the
 * grid renders from {@link useGridExportActions}, so every route to export reads
 * the same.
 */
export function gridExportMenuItems(exportActions: GridExportAction[]): GridMenuItem[] {
	return exportActions.map((action) => ({
		key: `export-${action.type}`,
		label: action.label,
		icon: exportIcon(action.type),
		onAction: action.run,
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
			onAction: () => sortColumn(column.id, 'asc'),
		},
		{
			key: 'sort-desc',
			label: 'Sort descending',
			icon: <ArrowDown />,
			onAction: () => sortColumn(column.id, 'desc'),
		},
	]

	if (sortDirection) {
		items.push({
			key: 'clear-sort',
			label: 'Clear sort',
			icon: <ArrowUpDown />,
			onAction: clearSort,
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
			onAction: () => autoSizeColumn(column.id),
		})
	}

	if (autoSizeColumns) {
		items.push({
			key: 'auto-size',
			label: 'Auto-size all columns',
			icon: <StretchHorizontal />,
			onAction: autoSizeColumns,
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

/**
 * The table-wide column manager as a menu row, or nothing when no manager is
 * reachable — the same withhold-when-empty shape the column's own concerns take.
 *
 * @internal
 */
function manageColumnsItems(chooseColumns: (() => void) | null): GridMenuItem[] {
	if (!chooseColumns) return []

	return [
		{ key: 'choose-columns', label: 'Manage columns', icon: <Columns3 />, onAction: chooseColumns },
	]
}

/**
 * The column's filter affordance for its menu: whether it can filter, the grid's
 * filter affordance, and the open action. `null` when the grid has no column
 * filters. Backs the "Filter …" item — present only in the `'menu'` affordance
 * (in `'header'` the column's funnel already offers it).
 *
 * @internal
 */
export type ColumnMenuFilter = {
	canFilter: boolean
	affordance: 'header' | 'menu'
	openFilter: () => void
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
	/** The column's filter affordance, or `null` when the grid has no column filters. */
	filter: ColumnMenuFilter | null
}

/**
 * The filter row for a column's menu: "Filter {column}", present only where the
 * grid surfaces filtering through the menu (the `'menu'` affordance) — the
 * primary way to filter a column whose header carries no resting funnel. In the
 * `'header'` affordance the funnel already offers it, so this contributes
 * nothing.
 *
 * @internal
 */
function filterMenuItems<T>(
	column: GridColumn<T>,
	filter: ColumnMenuFilter | null,
): GridMenuItem[] {
	if (filter?.affordance !== 'menu' || !filter.canFilter) return []

	return [
		{
			key: 'filter-column',
			label: `Filter ${columnLabel(column)}`,
			icon: <ListFilter />,
			onAction: filter.openFilter,
		},
	]
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
				onAction: () => groupBy.setGrouping(null),
			},
		]
	}

	return [
		{
			key: 'group-by',
			label: `Group by ${columnLabel(column)}`,
			icon: <Group />,
			onAction: () => groupBy.setGrouping(column.id),
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
		onAction: () => pinColumn(column.id, choice.target),
	}))
}

/** The glyph for each pin choice — icons stay in the shell, off the engine's decision tree. @internal */
export function pinChoiceIcon(key: PinMenuChoice['key']): ReactElement {
	if (key === 'pin-left') return <ArrowLeftToLine />

	return key === 'pin-right' ? <ArrowRightToLine /> : <PinOff />
}

/**
 * Default header-menu items, consolidated into hover-opened submenus so the
 * menu opens one row per concern rather than a dozen flat actions: "Manage
 * columns" (when a manager is reachable) leads, then the clicked column's own
 * concerns — Sort (the sort controls, with "Clear sort" once the column is the
 * sorted one), Pin (Pin left / Pin right / Unpin), the group-by toggle, a single
 * action so it stays a plain row, and Auto-size (this column, then all columns)
 * — and Export (one row per active export type) closes them out.
 *
 * @remarks Each menu withholds itself when it has nothing to offer — a locked
 * column shows no Pin, an unsortable one no Sort — and collapses to a plain row
 * when it holds a single action, so no submenu ever opens onto one item. The
 * defaults carry no rule of their own; a host's builder places any it wants.
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
		filter,
	} = args

	// The menu in order, each concern contributing its rows or none: the
	// table-wide manager first — the one row that isn't about the clicked column
	// at all — then that column's own, as the header reads them. Filter leads
	// those: under the `'menu'` affordance it is the only route to the column's
	// filter, the header having no funnel to click.
	return [
		...manageColumnsItems(chooseColumns),
		...filterMenuItems(column, filter),
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
		...submenuItems({
			key: 'export',
			label: 'Export',
			icon: <Download />,
			items: gridExportMenuItems(exportActions),
		}),
	]
}

/**
 * Default cell-menu items: Copy, acting on the right-clicked cell, then — when
 * export is on — the Export submenu, a grid-wide tool scoped to the selection
 * when rows are selected. Unruled, as the column menu's defaults are; a host's
 * builder places any separator it wants.
 *
 * @internal
 */
export function cellMenuDefaults(
	copy: () => void,
	exportActions: GridExportAction[],
): GridMenuItem[] {
	return [
		{ key: 'copy', label: 'Copy', icon: <Copy />, onAction: copy },
		...submenuItems({
			key: 'export',
			label: 'Export',
			icon: <Download />,
			items: gridExportMenuItems(exportActions),
		}),
	]
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
	// Two groups, ruled apart only when both show — which is what
	// `mergeContextMenuItems` is for, rather than counting rows by hand.
	return mergeContextMenuItems([
		args.chooseColumns
			? [
					{
						key: 'manage-columns',
						label: args.manageLabel,
						icon: <Columns3 />,
						onAction: args.chooseColumns,
					},
				]
			: [],
		args.group.color
			? [{ key: 'clear-color', label: 'Clear color', icon: <Ban />, onAction: args.onClearColor }]
			: [],
	])
}
