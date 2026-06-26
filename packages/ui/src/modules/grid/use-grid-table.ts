'use client'

import {
	type CellContext,
	type ColumnDef,
	type ColumnFiltersState,
	type ColumnSizingState,
	type FilterFn,
	getCoreRowModel,
	getFacetedRowModel,
	getFacetedUniqueValues,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type OnChangeFn,
	type PaginationState,
	type Row,
	type RowData,
	type SortingFn,
	type SortingState,
	type Table,
	type TableOptions,
	type Updater,
	useReactTable,
} from '@tanstack/react-table'
import { type ReactNode, type RefObject, useCallback, useMemo, useRef } from 'react'
import { useControllable } from '../../hooks'
import { isDataColumn } from '../../utilities'
import { evaluateQuery, type QueryGroupNode } from '../query'
import type { SortState } from './context'
import { DEFAULT_COLUMN_SIZE, DEFAULT_MIN_COLUMN_SIZE, DEFAULT_PAGE_SIZE } from './grid-constants'
import { compareSmart } from './grid-sorting-utilities'
import type {
	GridColumn,
	GridColumnFilters,
	GridColumnSizing,
	GridColumnSizingState,
	GridPagination,
	GridPaginationState,
	GridSearch,
} from './types'
import { useGridColumnFit } from './use-grid-column-fit'

declare module '@tanstack/react-table' {
	// Carries the source GridColumn on each ColumnDef so the body renderer reads a
	// column's chrome (selectable / actions / pinned / className / cellProps)
	// straight off the engine's cell model.
	interface ColumnMeta<TData extends RowData, TValue> {
		gridColumn: GridColumn<TData>
	}
}

/** First page at the default size; the fallback when no `value`/`defaultValue` page is bound. @internal */
const DEFAULT_PAGINATION_STATE: GridPaginationState = { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE }

/** Stable empty sizing default; read-only, replaced wholesale on change. @internal */
const EMPTY_SIZING: GridColumnSizingState = {}

/** Stable empty column-filters default; read-only, replaced wholesale on change. @internal */
const EMPTY_COLUMN_FILTERS: ColumnFiltersState = []

/** Search-input placeholder when {@link GridSearch} supplies none. @internal */
const DEFAULT_SEARCH_PLACEHOLDER = 'Search'

/** Resolves a TanStack `Updater<S>` against a base value. @internal */
function applyUpdater<S>(updater: Updater<S>, base: S): S {
	return typeof updater === 'function' ? (updater as (prev: S) => S)(base) : updater
}

/** Server (manual) pagination is implied once a total is supplied. @internal */
function isManualPagination(config: GridPagination | undefined): boolean {
	return config?.manual ?? (config?.rowCount != null || config?.pageCount != null)
}

/** Adapts the grid's single-column {@link SortState} to a TanStack `SortingState`. @internal */
function toSortingState(sort: SortState | undefined): SortingState {
	return sort ? [{ id: String(sort.column), desc: sort.direction === 'desc' }] : []
}

/** Adapts a TanStack `SortingState` back to the grid's single-column {@link SortState}. @internal */
function toSortState(sorting: SortingState): SortState | undefined {
	const first = sorting[0]

	return first ? { column: first.id, direction: first.desc ? 'desc' : 'asc' } : undefined
}

/** Resolves the table-wide filter mode shared by the global and per-column filters. @internal */
function resolveFilterMode(args: {
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
function usesClientModel(args: {
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

/** Narrows an unknown filter value to a query tree. @internal */
function isQueryGroup(value: unknown): value is QueryGroupNode {
	return value != null && typeof value === 'object' && (value as { type?: string }).type === 'group'
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
function toColumnDef<T>(col: GridColumn<T>): ColumnDef<T> {
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
function paginationOptions<T>(args: {
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
function filterOptions<T>(args: {
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
function sortOptions<T>(args: {
	clientSort: boolean
	onSortingChange: OnChangeFn<SortingState>
}): Partial<TableOptions<T>> {
	if (!args.clientSort) return {}

	return {
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: args.onSortingChange,
		enableMultiSort: false,
	}
}

/** Column-resize slice of the table options, or `{}` when resizing is off. @internal */
function resizeOptions<T>(args: {
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

/** The controlled state slices the active features own. @internal */
function buildState(args: {
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
}): {
	pagination?: PaginationState
	columnSizing?: ColumnSizingState
	globalFilter?: string
	columnFilters?: ColumnFiltersState
	sorting?: SortingState
} {
	const state: {
		pagination?: PaginationState
		columnSizing?: ColumnSizingState
		globalFilter?: string
		columnFilters?: ColumnFiltersState
		sorting?: SortingState
	} = {}

	if (args.paginated) state.pagination = args.pagination

	if (args.resizable) state.columnSizing = args.sizing

	if (args.globalFiltered) state.globalFilter = args.globalFilter

	if (args.columnFiltered) state.columnFilters = args.columnFilters

	if (args.sortClient) state.sorting = args.sorting

	return state
}

/** Assembles the table-backed {@link GridColumnResize} controls (all but `sizeToFit`, grafted on by the hook); every method reads it live. @internal */
function buildColumnResize<T>(table: Table<T>): Omit<GridColumnResize, 'sizeToFit'> {
	const bounds = (id: string | number) => {
		const column = table.getColumn(String(id))

		return {
			min: column?.columnDef.minSize ?? DEFAULT_MIN_COLUMN_SIZE,
			max: column?.columnDef.maxSize ?? Number.MAX_SAFE_INTEGER,
		}
	}

	return {
		getSize: (id) => table.getColumn(String(id))?.getSize() ?? DEFAULT_COLUMN_SIZE,
		totalSize: () => table.getTotalSize(),
		canResize: (id) => table.getColumn(String(id))?.getCanResize() ?? false,
		isResizing: (id) => table.getState().columnSizingInfo.isResizingColumn === String(id),
		getResizeHandler: (id) =>
			table
				.getFlatHeaders()
				.find((header) => header.column.id === String(id))
				?.getResizeHandler(),
		bounds,
		nudge: (id, delta) => {
			const column = table.getColumn(String(id))

			if (!column) return

			const limit = bounds(id)

			const next = Math.min(Math.max(column.getSize() + delta, limit.min), limit.max)

			table.setColumnSizing((prev) => ({ ...prev, [String(id)]: next }))
		},
	}
}

/** Assembles the {@link GridColumnFilter} controls over a table instance; methods read it live. @internal */
function buildColumnFilters<T>(table: Table<T>): GridColumnFilter {
	return {
		canFilter: (id) => table.getColumn(String(id))?.getCanFilter() ?? false,
		getQuery: (id) => {
			const value = table.getColumn(String(id))?.getFilterValue()

			return isQueryGroup(value) ? value : undefined
		},
		setQuery: (id, query) => table.getColumn(String(id))?.setFilterValue(query),
		uniqueValues: (id) => {
			const facets = table.getColumn(String(id))?.getFacetedUniqueValues()

			if (!facets) return []

			const values = [...facets.keys()]
				.filter((value) => value != null && value !== '')
				.map((value) => String(value))

			return [...new Set(values)].sort((a, b) => a.localeCompare(b))
		},
	}
}

/** Builds the {@link GridPaginationView} the footer renders from. @internal */
function buildPaginationView<T>(args: {
	table: Table<T>
	pagination: PaginationState
	manual: boolean
	config: GridPagination
	pageRowCount: number
}): GridPaginationView {
	const { pageIndex, pageSize } = args.pagination

	const onPage = args.pageRowCount

	// Pre-pagination count reflects any client-side filtering; server mode trusts the supplied total.
	const total = args.manual
		? args.config.rowCount
		: args.table.getPrePaginationRowModel().rows.length

	return {
		pageIndex,
		pageSize,
		pageCount: args.table.getPageCount(),
		rowCount: total,
		from: onPage === 0 ? 0 : pageIndex * pageSize + 1,
		to: onPage === 0 ? 0 : pageIndex * pageSize + onPage,
		canPrevious: args.table.getCanPreviousPage(),
		canNext: args.table.getCanNextPage(),
		pageSizeOptions: args.config.pageSizeOptions,
		setPageIndex: (index) => args.table.setPageIndex(index),
		setPageSize: (size) => args.table.setPageSize(size),
	}
}

/** Parameters for {@link useGridTable}. @internal */
type UseGridTableParams<T> = {
	rows: T[]
	columns: GridColumn<T>[]
	getKey: (row: T, index: number) => string | number
	sort?: SortState
	setSort?: (sort: SortState | undefined) => void
	sortManual?: boolean
	pagination?: GridPagination
	resizable?: boolean
	columnSizing?: GridColumnSizing
	globalFilter?: GridSearch
	columnFilters?: GridColumnFilters
	/** Grid wrapper element; measured to auto-size resizable columns to fill its width. */
	containerRef?: RefObject<HTMLElement | null>
}

/**
 * Column-resize controls the header renders from: the live width, drag/keyboard
 * handlers, and per-column bounds. Methods read the engine live, so the object
 * itself is stable across renders.
 *
 * @internal
 */
export type GridColumnResize = {
	/** Current clamped width (px) for a column. */
	getSize: (id: string | number) => number
	/** Total width (px) of every column — the width of the fixed-layout table. */
	totalSize: () => number
	/** Whether the column may be resized (data columns only). */
	canResize: (id: string | number) => boolean
	/** Whether the column is mid drag-resize. */
	isResizing: (id: string | number) => boolean
	/** Pointer handler (mouse + touch) that begins a drag-resize. */
	getResizeHandler: (id: string | number) => ((event: unknown) => void) | undefined
	/** Resize bounds for the column, for the separator's `aria-valuemin`/`max`. */
	bounds: (id: string | number) => { min: number; max: number }
	/** Adjust a column's width by `delta` px (keyboard), clamped to its bounds. */
	nudge: (id: string | number, delta: number) => void
	/** Auto-size data columns to fill the container width, re-arming auto-fit. */
	sizeToFit: () => void
}

/**
 * Per-column filter controls the header filter sheets render from. Methods
 * read the engine live, so the object itself is stable across renders.
 *
 * @internal
 */
export type GridColumnFilter = {
	/** Whether the column accepts a filter (declared `filterable` with a `value`). */
	canFilter: (id: string | number) => boolean
	/** Current query tree for the column, or `undefined` when unfiltered. */
	getQuery: (id: string | number) => QueryGroupNode | undefined
	/** Set (or, with `undefined`, clear) the column's query tree. */
	setQuery: (id: string | number, query: QueryGroupNode | undefined) => void
	/**
	 * The column's distinct cell values (faceted), sorted and de-duplicated — what
	 * a `select` filter offers when it declares no explicit `filterOptions`. Empty
	 * under server-side (manual) filtering or for a column without a value accessor.
	 */
	uniqueValues: (id: string | number) => string[]
}

/**
 * Resolved pagination view model the footer renders from — page coordinate,
 * derived totals and bounds, and the navigation setters that drive the engine.
 *
 * @internal
 */
export type GridPaginationView = {
	pageIndex: number
	pageSize: number
	/** Total pages, or `-1` when unknown (server mode with no `rowCount`/`pageCount`). */
	pageCount: number
	/** Total rows across pages when known: `rowCount` in server mode, the filtered count in client mode. */
	rowCount: number | undefined
	/** 1-based index of the first row shown on the page; `0` when the page is empty. */
	from: number
	/** 1-based index of the last row shown on the page; `0` when the page is empty. */
	to: number
	canPrevious: boolean
	canNext: boolean
	pageSizeOptions: number[] | undefined
	setPageIndex: (index: number) => void
	setPageSize: (size: number) => void
}

/** Global-filter view the search input renders from. @internal */
export type GridGlobalFilterView = {
	value: string
	setValue: (value: string) => void
	placeholder: string
}

/** Result of {@link useGridTable}. @internal */
type UseGridTableResult<T> = {
	/** The TanStack Table instance backing the grid. */
	table: Table<T>
	/** Rows to render: the engine-transformed slice when paginating/filtering client-side, else the supplied `rows`. */
	renderRows: T[]
	/** Footer view model, or `null` when pagination is not configured. */
	pagination: GridPaginationView | null
	/** Column-resize controls, or `null` when `resizable` is off. */
	resize: GridColumnResize | null
	/** Global-filter view, or `null` when filtering is not configured. */
	globalFilter: GridGlobalFilterView | null
	/** Per-column filter controls, or `null` when no column is filterable. */
	filters: GridColumnFilter | null
}

/**
 * Builds the engine `ColumnDef[]` with referentially-stable per-id cell
 * renderers. `flexRender(columnDef.cell, …)` makes the cell's component type the
 * `cell` function itself, so a fresh function each render would remount every
 * cell — dropping editor focus and selection, and flooding reconciliation. Each
 * id's renderer is created once and reads the latest column from a ref, so cell
 * content stays current while its identity holds. The rest of the def rebuilds
 * freely (only `cell`'s identity drives mounting); `meta` carries the source
 * column for the body's chrome.
 *
 * @internal
 */
function useStableColumnDefs<T>(columns: GridColumn<T>[]): ColumnDef<T>[] {
	const columnsById = useMemo(
		() => new Map(columns.map((col) => [String(col.id), col] as const)),
		[columns],
	)

	const columnsByIdRef = useRef(columnsById)

	columnsByIdRef.current = columnsById

	const cellRenderers = useRef(new Map<string, (info: CellContext<T, unknown>) => ReactNode>())

	return useMemo<ColumnDef<T>[]>(
		() =>
			columns.map((col) => {
				const id = String(col.id)

				let renderCell = cellRenderers.current.get(id)

				if (!renderCell) {
					renderCell = (info) => columnsByIdRef.current.get(id)?.cell?.(info.row.original) ?? null

					cellRenderers.current.set(id, renderCell)
				}

				return {
					...toColumnDef(col),
					meta: { gridColumn: col },
					...(col.cell ? { cell: renderCell } : {}),
				}
			}),
		[columns],
	)
}

/**
 * Builds the {@link https://tanstack.com/table | TanStack Table} instance that
 * powers a {@link Grid}: it adapts the grid's `GridColumn[]` to TanStack
 * `ColumnDef[]` (mapping `value` to an accessor) and `getKey` to `getRowId`,
 * then routes data through the table's row model so pagination, filtering, and
 * column sizing ride one engine.
 *
 * @remarks Each feature is opt-in. Pagination and filtering each run server-side
 * (`manual`, the consumer transforms `rows`) or client-side (the engine slices
 * and filters); resizing rides the column-sizing API. The row model is only
 * materialized when a client-side transform is active, so a plain grid renders
 * straight from `rows`. `autoResetPageIndex` is off: the page is consumer-controlled.
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function useGridTable<T>({
	rows,
	columns,
	getKey,
	sort,
	setSort,
	sortManual = true,
	pagination: paginationConfig,
	resizable = false,
	columnSizing: columnSizingConfig,
	globalFilter: globalFilterConfig,
	columnFilters: columnFiltersConfig,
	containerRef,
}: UseGridTableParams<T>): UseGridTableResult<T> {
	const columnDefs = useStableColumnDefs(columns)

	const paginated = paginationConfig != null

	// Server mode is implied once a total is supplied; otherwise the grid slices.
	const manual = isManualPagination(paginationConfig)

	const [paginationState, setPaginationState] = useControllable<GridPaginationState>({
		value: paginationConfig?.value,
		defaultValue: paginationConfig?.defaultValue ?? DEFAULT_PAGINATION_STATE,
		// The page is never meaningfully `undefined`; coalesce so the public
		// callback keeps its non-nullable shape.
		onValueChange: (next) => paginationConfig?.onValueChange?.(next ?? DEFAULT_PAGINATION_STATE),
	})

	const resolvedPagination = paginationState ?? DEFAULT_PAGINATION_STATE

	// Bridge TanStack's `Updater<T>` onto each controllable setter so the table's
	// own imperative methods flow out through the public `onValueChange`.
	const onPaginationChange = useCallback<OnChangeFn<PaginationState>>(
		(updater) =>
			setPaginationState((prev) => applyUpdater(updater, prev ?? DEFAULT_PAGINATION_STATE)),
		[setPaginationState],
	)

	const [columnSizingState, setColumnSizingState] = useControllable<GridColumnSizingState>({
		value: columnSizingConfig?.value,
		defaultValue: columnSizingConfig?.defaultValue ?? EMPTY_SIZING,
		onValueChange: (next) => columnSizingConfig?.onValueChange?.(next ?? {}),
	})

	const resolvedSizing = columnSizingState ?? EMPTY_SIZING

	const onColumnSizingChange = useCallback<OnChangeFn<ColumnSizingState>>(
		(updater) => setColumnSizingState((prev) => applyUpdater(updater, prev ?? EMPTY_SIZING)),
		[setColumnSizingState],
	)

	const globalConfigured = globalFilterConfig != null

	const [globalFilterState, setGlobalFilterState] = useControllable<string>({
		value: globalFilterConfig?.value,
		defaultValue: globalFilterConfig?.defaultValue ?? '',
		onValueChange: (next) => globalFilterConfig?.onValueChange?.(next ?? ''),
	})

	const resolvedGlobalFilter = globalFilterState ?? ''

	const onGlobalFilterChange = useCallback<OnChangeFn<string>>(
		(updater) => setGlobalFilterState((prev) => applyUpdater(updater, prev ?? '')),
		[setGlobalFilterState],
	)

	const hasColumnFilters = columns.some((col) => Boolean(col.filterable && col.value))

	const [columnFiltersState, setColumnFiltersState] = useControllable<ColumnFiltersState>({
		value: columnFiltersConfig?.value,
		defaultValue: columnFiltersConfig?.defaultValue ?? EMPTY_COLUMN_FILTERS,
		onValueChange: (next) => columnFiltersConfig?.onValueChange?.(next ?? []),
	})

	const resolvedColumnFilters = columnFiltersState ?? EMPTY_COLUMN_FILTERS

	const onColumnFiltersChange = useCallback<OnChangeFn<ColumnFiltersState>>(
		(updater) =>
			setColumnFiltersState((prev) => applyUpdater(updater, prev ?? EMPTY_COLUMN_FILTERS)),
		[setColumnFiltersState],
	)

	const filterMode = resolveFilterMode({
		globalConfigured,
		hasColumnFilters,
		globalManual: globalFilterConfig?.manual,
		columnManual: columnFiltersConfig?.manual,
	})

	const clientSort = sortManual === false

	const onSortingChange = useCallback<OnChangeFn<SortingState>>(
		(updater) => setSort?.(toSortState(applyUpdater(updater, toSortingState(sort)))),
		[sort, setSort],
	)

	const getRowId = useCallback((row: T, index: number) => String(getKey(row, index)), [getKey])

	const table = useReactTable<T>({
		data: rows,
		columns: columnDefs,
		getRowId,
		getCoreRowModel: getCoreRowModel(),
		// The page coordinate, widths, and query are owned by controllable bindings.
		autoResetPageIndex: false,
		state: buildState({
			paginated,
			pagination: resolvedPagination,
			resizable,
			sizing: resolvedSizing,
			globalFiltered: globalConfigured,
			globalFilter: resolvedGlobalFilter,
			columnFiltered: hasColumnFilters,
			columnFilters: resolvedColumnFilters,
			sortClient: clientSort,
			sorting: toSortingState(sort),
		}),
		...paginationOptions<T>({ paginated, manual, config: paginationConfig, onPaginationChange }),
		...resizeOptions<T>({ resizable, onColumnSizingChange }),
		...sortOptions<T>({ clientSort, onSortingChange }),
		...filterOptions<T>({
			configured: filterMode.configured,
			manual: filterMode.manual,
			onGlobalFilterChange: globalConfigured ? onGlobalFilterChange : undefined,
			onColumnFiltersChange: hasColumnFilters ? onColumnFiltersChange : undefined,
		}),
	})

	// Materialize the row model only when a client-side transform is active;
	// otherwise hand `rows` straight to the body.
	const clientTransform = usesClientModel({
		paginated,
		paginationManual: manual,
		filtersConfigured: filterMode.configured,
		filtersManual: filterMode.manual,
		sortClient: clientSort,
	})

	const renderRows =
		paginated || clientTransform
			? table.getRowModel().rows.map((modelRow) => modelRow.original)
			: rows

	// Computed each render (not memoized) so the total reflects live client-side
	// filtering — read through `table`, which a deps array can't observe; the
	// footer is cheap and re-renders with the grid regardless.
	const pagination =
		paginated && paginationConfig
			? buildPaginationView({
					table,
					pagination: resolvedPagination,
					manual,
					config: paginationConfig,
					pageRowCount: renderRows.length,
				})
			: null

	// Auto-size resizable columns to fill the container, unless widths are
	// controlled; `sizeToFit` also backs the header "Auto-size columns" action.
	const { sizeToFit } = useGridColumnFit<T>({
		resizable,
		controlled: columnSizingConfig?.value != null,
		table,
		columns,
		containerRef,
	})

	const resize = useMemo<GridColumnResize | null>(
		() => (resizable ? { ...buildColumnResize(table), sizeToFit } : null),
		[resizable, table, sizeToFit],
	)

	const globalFilter = useMemo<GridGlobalFilterView | null>(
		() =>
			globalConfigured
				? {
						value: resolvedGlobalFilter,
						setValue: (value: string) => table.setGlobalFilter(value),
						placeholder: globalFilterConfig?.placeholder ?? DEFAULT_SEARCH_PLACEHOLDER,
					}
				: null,
		[globalConfigured, resolvedGlobalFilter, globalFilterConfig, table],
	)

	const filters = useMemo<GridColumnFilter | null>(
		() => (hasColumnFilters ? buildColumnFilters(table) : null),
		[hasColumnFilters, table],
	)

	return { table, renderRows, pagination, resize, globalFilter, filters }
}
