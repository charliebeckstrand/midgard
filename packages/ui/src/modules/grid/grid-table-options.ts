import {
	type ColumnDef,
	type ColumnFiltersState,
	type ColumnOrderState,
	type ColumnPinningState,
	type ColumnSizingState,
	type FilterFn,
	getFacetedRowModel,
	getFacetedUniqueValues,
	getFilteredRowModel,
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
import { compareSmart } from './grid-sorting-utilities'
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
}): boolean {
	return (
		(args.paginated && !args.paginationManual) ||
		(args.filtersConfigured && !args.filtersManual) ||
		args.sortClient
	)
}

/** Parses a plain `px`/unitless CSS width to a number, or `undefined` for relative/auto widths. @internal */
function parsePxWidth(width: string | undefined): number | undefined {
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
 * Default column sort: compares each row's accessor value with the smart
 * comparator, so numbers, money, percentages, and the like sort correctly out of
 * the box rather than lexically. Row-shape-agnostic; cast to a column's row type.
 *
 * @internal
 */
const smartSortingFn: SortingFn<unknown> = (rowA, rowB, columnId) =>
	compareSmart(rowA.getValue(columnId), rowB.getValue(columnId))

/** Maps a grid column to its engine `ColumnDef`: identity, the sort/filter value accessor, the sort comparator, the resize gate, and sizing bounds. @internal */
export function toColumnDef<T>(col: GridColumn<T>): ColumnDef<T> {
	const size = parsePxWidth(col.width)

	const { value, sortFn } = col

	// Sort and filter read a column's value through an accessor. An explicit
	// `value` wins; otherwise a data column falls back to the row field named by
	// its id, so columns sort client-side out of the box. Quick search stays
	// scoped to columns that declare `value` via `enableGlobalFilter`.
	const accessorFn = value ?? (isDataColumn(col) ? (row: T) => readField(row, col.id) : undefined)

	// A column's manual comparator wins; otherwise the smart default. Either runs
	// only under client sorting (the engine's sorted row model).
	const sortingFn: SortingFn<T> = sortFn
		? (rowA, rowB) => sortFn(rowA.original, rowB.original)
		: (smartSortingFn as SortingFn<T>)

	return {
		id: String(col.id),
		// Only data columns resize; select/actions hold their width.
		enableResizing: isDataColumn(col),
		enableColumnFilter: Boolean(col.filterable && value),
		enableGlobalFilter: Boolean(value),
		enableSorting: Boolean(col.sortable),
		// The accessor feeds sort/filter without changing how the cell renders
		// (still `col.cell`).
		...(accessorFn ? { accessorFn } : {}),
		// Smart/manual comparator for the data columns that can sort.
		...(isDataColumn(col) ? { sortingFn } : {}),
		// The query filter is row-shape-agnostic; cast to this column's row type.
		...(col.filterable && value ? { filterFn: queryFilterFn as FilterFn<T> } : {}),
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

	if (args.sortClient) state.sorting = args.sorting

	if (args.pinned) state.columnPinning = args.columnPinning

	if (args.selectable) state.rowSelection = args.rowSelection

	return state
}
