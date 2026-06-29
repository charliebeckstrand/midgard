'use client'

import {
	type CellContext,
	type ColumnDef,
	type ColumnFiltersState,
	type ColumnOrderState,
	type ColumnSizingState,
	getCoreRowModel,
	type OnChangeFn,
	type PaginationState,
	type RowData,
	type SortingState,
	type Table,
	type Updater,
	useReactTable,
	type VisibilityState,
} from '@tanstack/react-table'
import { type ReactNode, type RefObject, useCallback, useMemo, useRef } from 'react'
import { useControllable } from '../../hooks'
import type { DensityLevel } from '../../providers/density/context'
import type { SortState } from './context'
import { DEFAULT_PAGE_SIZE } from './grid-constants'
import {
	buildState,
	filterOptions,
	paginationOptions,
	resizeOptions,
	resolveFilterMode,
	sortOptions,
	toColumnDef,
	toRowSelectionState,
	toSortingState,
	toSortState,
	usesClientModel,
} from './grid-table-options'
import {
	buildColumnFilters,
	buildColumnPinning,
	buildColumnResize,
	buildPaginationView,
	type GridColumnFilter,
	type GridColumnPinning,
	type GridColumnResize,
	type GridGlobalFilterView,
	type GridPaginationView,
	toColumnPinningState,
	useVisibleColumns,
} from './grid-table-views'
import type {
	GridColumn,
	GridColumnFilters,
	GridColumnSizing,
	GridColumnSizingState,
	GridPagination,
	GridPaginationState,
	GridSearch,
} from './types'
import { useGridColumnAutoSize } from './use-grid-column-auto-size'

export type {
	GridColumnFilter,
	GridColumnPinning,
	GridColumnResize,
	GridGlobalFilterView,
	GridPaginationView,
} from './grid-table-views'

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

/** Stable empty column-order default (engine reads definition order); read-only. @internal */
const EMPTY_COLUMN_ORDER: (string | number)[] = []

/** Stable empty column-visibility default (all visible); read-only. @internal */
const EMPTY_VISIBILITY: VisibilityState = {}

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

/** Parameters for {@link useGridTable}. @internal */
type UseGridTableParams<T> = {
	rows: T[]
	/** The full column set; the engine resolves which render (and in what order) from the order/visibility/pinning state below. */
	columns: GridColumn<T>[]
	getKey: (row: T, index: number) => string | number
	/** Selected row keys; mirrored into the engine's `state.rowSelection` so its selected-row model tracks the grid's `Set`. */
	selection?: Set<string | number>
	/** Display order of the column ids; feeds the engine's `columnOrder`. Columns absent from it append in definition order. */
	columnOrder?: (string | number)[]
	/** Hidden-column map (`{ id: false }`) feeding the engine's `columnVisibility`. */
	columnVisibility?: VisibilityState
	sort?: SortState[]
	setSort?: (sort: SortState[]) => void
	sortManual?: boolean
	pagination?: GridPagination
	resizable?: boolean
	columnSizing?: GridColumnSizing
	globalFilter?: GridSearch
	columnFilters?: GridColumnFilters
	/** Grid wrapper element; measured to auto-size resizable columns to fill its width. */
	containerRef?: RefObject<HTMLElement | null>
	/** Table density; threaded to the autosizer, whose measurements scale with it. */
	density?: DensityLevel
}

/** Result of {@link useGridTable}. @internal */
type UseGridTableResult<T> = {
	/** The TanStack Table instance backing the grid. */
	table: Table<T>
	/**
	 * Columns to render in resolved display order — the engine's visible leaf
	 * columns (order + visibility + pinning applied), mapped back to their source
	 * {@link GridColumn}. The header, body `<colgroup>`, and menus all read this.
	 */
	visibleColumns: GridColumn<T>[]
	/** Rows to render: the engine-transformed slice when paginating/filtering client-side, else the supplied `rows`. */
	renderRows: T[]
	/**
	 * Per-row keys parallel to {@link renderRows}: each is the value `getKey`
	 * yields at the row's engine (original-data) index — the index `getRowId` saw —
	 * so its stringified form matches the id `table.getRow` is keyed by, while the
	 * raw `string | number` value still backs selection identity.
	 */
	rowKeys: (string | number)[]
	/** Footer view model, or `null` when pagination is not configured. */
	pagination: GridPaginationView | null
	/** Column-resize controls, or `null` when `resizable` is off. */
	resize: GridColumnResize | null
	/** Global-filter view, or `null` when filtering is not configured. */
	globalFilter: GridGlobalFilterView | null
	/** Per-column filter controls, or `null` when no column is filterable. */
	filters: GridColumnFilter | null
	/** Frozen-column controls, or `null` when no column is pinned. */
	pinning: GridColumnPinning | null
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
	selection,
	columnOrder = EMPTY_COLUMN_ORDER,
	columnVisibility = EMPTY_VISIBILITY,
	sort,
	setSort,
	// Client-side sorting by default, matching GridColumn's contract; the Grid
	// passes `sortConfig?.manual ?? false`, so this default only backs direct
	// callers that omit it.
	sortManual = false,
	pagination: paginationConfig,
	resizable = false,
	columnSizing: columnSizingConfig,
	globalFilter: globalFilterConfig,
	columnFilters: columnFiltersConfig,
	containerRef,
	density,
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

	// Frozen columns, keyed off each column's `pinned` flag. The engine pulls them
	// to their edge via `columnPinning`, so these id lists drive the sticky order.
	const { state: columnPinning, hasPinned } = useMemo(
		() => toColumnPinningState(columns),
		[columns],
	)

	// The grid's selection `Set` is the source of truth; mirror it into the engine
	// so its selected-row model tracks it (the checkboxes still write the `Set`).
	const selectable = selection != null

	const rowSelection = useMemo(() => toRowSelectionState(selection), [selection])

	// Engine column-order state: the display order as string ids (columns absent
	// from it append in definition order). Visibility defaults to all-visible.
	const engineColumnOrder = useMemo<ColumnOrderState>(() => columnOrder.map(String), [columnOrder])

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
			pinned: hasPinned,
			columnPinning,
			selectable,
			rowSelection,
			columnOrder: engineColumnOrder,
			columnVisibility,
		}),
		...(selectable ? { enableRowSelection: true } : {}),
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

	const visibleColumns = useVisibleColumns(table)

	// Materialize the row model only when a client-side transform is active;
	// otherwise hand `rows` straight to the body.
	const clientTransform = usesClientModel({
		paginated,
		paginationManual: manual,
		filtersConfigured: filterMode.configured,
		filtersManual: filterMode.manual,
		sortClient: clientSort,
	})

	// `getRowModel().rows` is reference-stable until the sort/filter/pagination
	// state actually changes, so memoizing on it keeps `renderRows` and `rowKeys`
	// — and the `rowIndexMap` GridData derives from them — stable across unrelated
	// re-renders (resize-drag frames, selection toggles, search keystrokes),
	// instead of reallocating the full set every render.
	const modelRows = paginated || clientTransform ? table.getRowModel().rows : null

	const renderRows = useMemo(
		() => (modelRows ? modelRows.map((modelRow) => modelRow.original) : rows),
		[modelRows, rows],
	)

	// Keys parallel to `renderRows`, each keyed off the engine's original-data row
	// index (`modelRow.index`, the index `getRowId` saw), not the rendered
	// position. A client transform reorders rows while their engine ids stay fixed
	// to the original order, so deriving keys from the rendered index would diverge
	// from `getRowId` and make the body's `table.getRow(key)` lookups miss; the
	// passthrough order *is* the original order, so the index matches directly.
	const rowKeys = useMemo<(string | number)[]>(
		() =>
			modelRows
				? modelRows.map((modelRow) => getKey(modelRow.original, modelRow.index))
				: rows.map((row, index) => getKey(row, index)),
		[modelRows, rows, getKey],
	)

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
	const { sizeToFit } = useGridColumnAutoSize<T>({
		resizable,
		controlled: columnSizingConfig?.value != null,
		table,
		// Fit distributes width across the *visible* data columns, not the hidden ones.
		columns: visibleColumns,
		containerRef,
		density,
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

	const pinning = useMemo<GridColumnPinning | null>(
		() => (hasPinned ? buildColumnPinning(table) : null),
		[hasPinned, table],
	)

	return {
		table,
		visibleColumns,
		renderRows,
		rowKeys,
		pagination,
		resize,
		globalFilter,
		filters,
		pinning,
	}
}
