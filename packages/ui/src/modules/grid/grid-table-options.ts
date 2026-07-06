import {
	type ColumnDef,
	type ColumnFiltersState,
	type ColumnOrderState,
	type ColumnPinningState,
	type ColumnSizingState,
	type ExpandedState,
	type FilterFn,
	type GroupingState,
	getExpandedRowModel,
	getFacetedRowModel,
	getFacetedUniqueValues,
	getFilteredRowModel,
	getGroupedRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type OnChangeFn,
	type PaginationState,
	type Row,
	type RowSelectionState,
	type SortingFn,
	type SortingState,
	type TableOptions,
	type VisibilityState,
} from '@tanstack/react-table'
import { isDataColumn } from '../../utilities'
import { evaluateQuery } from '../query'
import type { SortState } from './context'
import { DRAG_HANDLE_COLUMN_SIZE, EXPANDER_COLUMN_SIZE, SELECT_COLUMN_SIZE } from './grid-constants'
import { compareSortKeys, type SortKey, toSortKey } from './grid-sorting-utilities'
import { isQueryGroup } from './grid-table-views'
import type { GridColumn, GridPagination } from './types'

/** Adapts the grid's ordered {@link SortState} list to a TanStack `SortingState`, priority order preserved. @internal */
export function toSortingState(sort: SortState[] | undefined): SortingState {
	return (sort ?? []).map((entry) => ({
		id: String(entry.column),
		desc: entry.direction === 'desc',
	}))
}

/** Adapts a TanStack `SortingState` back to the grid's ordered {@link SortState} list. @internal */
export function toSortState(sorting: SortingState): SortState[] {
	return sorting.map((entry) => ({ column: entry.id, direction: entry.desc ? 'desc' : 'asc' }))
}

/**
 * Mirrors the grid's selection `Set<key>` into TanStack's `RowSelectionState`
 * (`{ [rowId]: true }`), keyed by the stringified row id `getRowId` produces.
 * One-way: the `Set` stays the source of truth (the grid's checkboxes write it),
 * and the engine reads this for its selected-row model.
 *
 * @internal
 */
export function toRowSelectionState(
	selection: Set<string | number> | undefined,
): RowSelectionState {
	const state: RowSelectionState = {}

	if (!selection) return state

	for (const key of selection) state[String(key)] = true

	return state
}

/** Resolves the table-wide filter mode shared by the global and per-column filters. @internal */
export function resolveFilterMode(args: {
	globalConfigured: boolean
	hasColumnFilters: boolean
	globalManual: boolean | undefined
	columnManual: boolean | undefined
}): { configured: boolean; manual: boolean } {
	return {
		configured: args.globalConfigured || args.hasColumnFilters,
		manual: Boolean(args.globalManual) || Boolean(args.columnManual),
	}
}

/** Whether the engine transforms the rows itself (vs. the consumer doing it server-side). @internal */
export function usesClientModel(args: {
	paginated: boolean
	paginationManual: boolean
	filtersConfigured: boolean
	filtersManual: boolean
	sortClient: boolean
	grouped: boolean
}): boolean {
	return (
		(args.paginated && !args.paginationManual) ||
		(args.filtersConfigured && !args.filtersManual) ||
		args.sortClient ||
		// Grouping always transforms the flat rows into group + leaf display rows.
		args.grouped
	)
}

/** Parses a plain `px`/unitless CSS width to a number, or `undefined` for relative/auto widths. @internal */
export function parsePxWidth(width: string | undefined): number | undefined {
	if (width == null) return undefined

	const match = /^(\d+(?:\.\d+)?)(?:px)?$/.exec(width.trim())

	return match ? Number(match[1]) : undefined
}

/** Reads the row field named by a column id — the default sort accessor when a column declares no `value`. @internal */
function readField<T>(row: T, id: string | number): unknown {
	return (row as Record<string | number, unknown>)[id]
}

/**
 * Column filter: evaluates the column's query tree against the row, reading the
 * cell through the column accessor. A non-query value imposes no filter, and an
 * empty tree auto-removes, so a half-built rule never hides rows.
 *
 * @internal
 */
const queryFilterFn: FilterFn<unknown> = (row: Row<unknown>, columnId, filterValue) =>
	!isQueryGroup(filterValue) || evaluateQuery(filterValue, () => row.getValue(columnId))

queryFilterFn.autoRemove = (value) => !isQueryGroup(value) || value.children.length === 0

/**
 * Each row's decorated {@link SortKey}, cached per column on the row. A sort
 * compares a row O(log N) times; without this the smart comparator would reparse
 * the value (the currency / percent / accounting regexes) on every comparison.
 * Keyed by the stable engine `Row` and resolved through the engine's own cached
 * `getValue`, so a value is decoded once per sort and the entry falls away with
 * the row model when the data changes — a `WeakMap` holds no row alive.
 *
 * @internal
 */
const sortKeyCache = new WeakMap<Row<unknown>, Map<string, SortKey>>()

/** This row's {@link SortKey} for `columnId`, decoded once on first use and reused across the sort's comparisons. @internal */
function rowSortKey(row: Row<unknown>, columnId: string): SortKey {
	let perColumn = sortKeyCache.get(row)

	if (!perColumn) {
		perColumn = new Map()

		sortKeyCache.set(row, perColumn)
	}

	let key = perColumn.get(columnId)

	if (key === undefined) {
		key = toSortKey(row.getValue(columnId))

		perColumn.set(columnId, key)
	}

	return key
}

/**
 * Default column sort: orders each row by the smart {@link SortKey} of its
 * accessor value — numbers, money, percentages, dates, and the like sort
 * correctly out of the box rather than lexically — decorating each value once per
 * sort (see {@link rowSortKey}). Row-shape-agnostic; cast to a column's row type.
 *
 * @internal
 */
const smartSortingFn: SortingFn<unknown> = (rowA, rowB, columnId) =>
	compareSortKeys(rowSortKey(rowA, columnId), rowSortKey(rowB, columnId))

/**
 * Resolves a column's engine behaviors from its declaration: the sort/filter
 * value `accessorFn` (an explicit `value`, else the row field named by a data
 * column's id — so columns sort client-side out of the box), the `sortingFn` (a
 * column's manual `sortFn`, else the smart default; data columns only), and the
 * query `filterFn` (a filterable column with a value). Each is `undefined` when
 * the column opts out, so {@link toColumnDef} spreads only what applies. The
 * comparator and filter are row-shape agnostic, cast to the column's row type.
 *
 * @internal
 */
function deriveColumnBehavior<T>(col: GridColumn<T>) {
	const { value, sortFn } = col

	const accessorFn = value ?? (isDataColumn(col) ? (row: T) => readField(row, col.id) : undefined)

	const sortingFn: SortingFn<T> | undefined = !isDataColumn(col)
		? undefined
		: sortFn
			? (rowA, rowB) => sortFn(rowA.original, rowB.original)
			: (smartSortingFn as SortingFn<T>)

	const filterFn: FilterFn<T> | undefined =
		col.filterable && value ? (queryFilterFn as FilterFn<T>) : undefined

	return { accessorFn, sortingFn, filterFn }
}

/** The natural affordance width a non-data column holds, or `undefined` for a data column. @internal */
function affordanceColumnSize<T>(col: GridColumn<T>): number | undefined {
	if (col.selectable) return SELECT_COLUMN_SIZE

	if (col.dragHandle) return DRAG_HANDLE_COLUMN_SIZE

	if (col.expander) return EXPANDER_COLUMN_SIZE

	return undefined
}

/** Maps a grid column to its engine `ColumnDef`: identity, the capability gates, the resolved behaviors (see {@link deriveColumnBehavior}), and sizing bounds. @internal */
export function toColumnDef<T>(col: GridColumn<T>): ColumnDef<T> {
	// A width-less column takes the engine's 150px default; the selection,
	// drag-handle, and expander columns instead hold a natural affordance width so
	// they aren't that wide. (The non-resizable auto layout already sizes them to
	// content via `w-px`.)
	const size = parsePxWidth(col.width) ?? affordanceColumnSize(col)

	const { accessorFn, sortingFn, filterFn } = deriveColumnBehavior(col)

	return {
		id: String(col.id),
		// Only data columns resize; select/actions hold their width.
		enableResizing: isDataColumn(col),
		enableColumnFilter: Boolean(col.filterable && col.value),
		// Quick search stays scoped to columns that declare `value`.
		enableGlobalFilter: Boolean(col.value),
		enableSorting: Boolean(col.sortable),
		// Only data columns group (they carry the accessor grouping keys on); the
		// selection / actions / drag-handle columns can't be a `groupBy` target.
		enableGrouping: isDataColumn(col),
		// The accessor feeds sort/filter without changing how the cell renders.
		...(accessorFn ? { accessorFn } : {}),
		...(sortingFn ? { sortingFn } : {}),
		...(filterFn ? { filterFn } : {}),
		...(size != null ? { size } : {}),
		...(col.minWidth != null ? { minSize: col.minWidth } : {}),
		...(col.maxWidth != null ? { maxSize: col.maxWidth } : {}),
	}
}

/** Server-mode total-count option: prefer `pageCount`, fall back to `rowCount`, else neither. @internal */
function manualTotals(
	config: GridPagination | undefined,
): { pageCount: number } | { rowCount: number } | undefined {
	if (config?.pageCount != null) return { pageCount: config.pageCount }

	if (config?.rowCount != null) return { rowCount: config.rowCount }

	return undefined
}

/** Pagination slice of the table options, or `{}` when pagination is off. @internal */
export function paginationOptions<T>(args: {
	paginated: boolean
	manual: boolean
	config: GridPagination | undefined
	onPaginationChange: OnChangeFn<PaginationState>
}): Partial<TableOptions<T>> {
	if (!args.paginated) return {}

	return {
		onPaginationChange: args.onPaginationChange,
		...(args.manual
			? { manualPagination: true, ...manualTotals(args.config) }
			: { getPaginationRowModel: getPaginationRowModel() }),
	}
}

/** Global-filter slice of the table options, or `{}` when filtering is off. @internal */
export function filterOptions<T>(args: {
	configured: boolean
	manual: boolean
	onGlobalFilterChange?: OnChangeFn<string>
	onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>
}): Partial<TableOptions<T>> {
	if (!args.configured) return {}

	return {
		globalFilterFn: 'includesString',
		...(args.onGlobalFilterChange ? { onGlobalFilterChange: args.onGlobalFilterChange } : {}),
		...(args.onColumnFiltersChange ? { onColumnFiltersChange: args.onColumnFiltersChange } : {}),
		// Client filtering also faceted: a select filter can offer the column's own
		// values (unique values reflect the rows left by *other* filters). Manual
		// mode sees only the server page, so faceting stands down there.
		...(args.manual
			? { manualFiltering: true }
			: {
					getFilteredRowModel: getFilteredRowModel(),
					getFacetedRowModel: getFacetedRowModel(),
					getFacetedUniqueValues: getFacetedUniqueValues(),
				}),
	}
}

/** Client-sort slice of the table options, or `{}` when sorting stays consumer-driven. @internal */
export function sortOptions<T>(args: {
	clientSort: boolean
	onSortingChange: OnChangeFn<SortingState>
}): Partial<TableOptions<T>> {
	if (!args.clientSort) return {}

	return {
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: args.onSortingChange,
		// The grid owns the additive Shift-click model, so the engine should honor a
		// multi-column sorting state rather than collapse it to one column.
		enableMultiSort: true,
	}
}

/**
 * Row-grouping slice of the table options, or `{}` when grouping is off: the
 * grouped and expanded row models plus their change handlers. Client-side only
 * (`manualGrouping: false`), so the engine collects the groups from the filtered
 * rows itself.
 *
 * @internal
 */
export function groupingOptions<T>(args: {
	grouped: boolean
	onGroupingChange: OnChangeFn<GroupingState>
	onExpandedChange: OnChangeFn<ExpandedState>
}): Partial<TableOptions<T>> {
	if (!args.grouped) return {}

	return {
		getGroupedRowModel: getGroupedRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		onGroupingChange: args.onGroupingChange,
		onExpandedChange: args.onExpandedChange,
		manualGrouping: false,
	}
}

/** Column-resize slice of the table options, or `{}` when resizing is off. @internal */
export function resizeOptions<T>(args: {
	resizable: boolean
	onColumnSizingChange: OnChangeFn<ColumnSizingState>
}): Partial<TableOptions<T>> {
	if (!args.resizable) return {}

	return {
		enableColumnResizing: true,
		columnResizeMode: 'onChange',
		onColumnSizingChange: args.onColumnSizingChange,
	}
}

/**
 * Raises each width in a column-sizing update to its measured floor, so a
 * drag-resize can't pull a column below the width its header needs — a
 * single-word header stays whole (it never truncates), a multi-word one keeps
 * its affordance icons. The engine's resize handler writes the dragged width
 * clamped only at zero (the `minSize` floor is applied later, at read time), and
 * every write — drag, keyboard, autosizer — funnels through here, so this is the
 * one place a sub-floor width is caught before it reaches the controlled state.
 *
 * `floors` carries only the columns the autosizer has measured; a column without
 * an entry (none recorded yet, or width-controlled) is left to the engine's own
 * `minSize`. Returns the input object unchanged when nothing sits below its
 * floor, so the autosizer's no-op ticks don't churn a fresh object through the
 * controlled state and re-render the grid for nothing.
 *
 * @internal
 */
export function clampSizingToFloors(
	sizing: ColumnSizingState,
	floors: ReadonlyMap<string, number>,
): ColumnSizingState {
	let result = sizing

	for (const id in sizing) {
		const floor = floors.get(id)

		const width = sizing[id]

		if (floor != null && width != null && width < floor) {
			if (result === sizing) result = { ...sizing }

			result[id] = floor
		}
	}

	return result
}

/**
 * The controlled state slices passed to the engine: each active feature's slice
 * is optional, but the grid always owns column order and visibility.
 *
 * @internal
 */
type GridControlledState = {
	pagination?: PaginationState
	columnSizing?: ColumnSizingState
	globalFilter?: string
	columnFilters?: ColumnFiltersState
	sorting?: SortingState
	columnPinning?: ColumnPinningState
	rowSelection?: RowSelectionState
	grouping?: GroupingState
	expanded?: ExpandedState
	columnOrder: ColumnOrderState
	columnVisibility: VisibilityState
}

/** The controlled state slices the active features own. @internal */
export function buildState(args: {
	paginated: boolean
	pagination: PaginationState
	resizable: boolean
	sizing: ColumnSizingState
	globalFiltered: boolean
	globalFilter: string
	columnFiltered: boolean
	columnFilters: ColumnFiltersState
	sortClient: boolean
	sorting: SortingState
	pinned: boolean
	columnPinning: ColumnPinningState
	selectable: boolean
	rowSelection: RowSelectionState
	grouped: boolean
	grouping: GroupingState
	expanded: ExpandedState
	columnOrder: ColumnOrderState
	columnVisibility: VisibilityState
}): GridControlledState {
	const state: GridControlledState = {
		columnOrder: args.columnOrder,
		columnVisibility: args.columnVisibility,
	}

	if (args.paginated) state.pagination = args.pagination

	if (args.resizable) state.columnSizing = args.sizing

	if (args.globalFiltered) state.globalFilter = args.globalFilter

	if (args.columnFiltered) state.columnFilters = args.columnFilters

	if (args.grouped) {
		state.grouping = args.grouping

		state.expanded = args.expanded
	}

	if (args.sortClient) state.sorting = args.sorting

	if (args.pinned) state.columnPinning = args.columnPinning

	if (args.selectable) state.rowSelection = args.rowSelection

	return state
}
