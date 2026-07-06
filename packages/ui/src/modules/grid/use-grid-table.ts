'use client'

import {
	type CellContext,
	type ColumnDef,
	type ColumnFiltersState,
	type ColumnOrderState,
	type ColumnSizingState,
	type ExpandedState,
	type GroupingState,
	getCoreRowModel,
	type OnChangeFn,
	type PaginationState,
	type Row,
	type RowData,
	type SortingFn,
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
	clampSizingToFloors,
	filterOptions,
	groupingOptions,
	makeSmartSortingFn,
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

/** Stable empty grouping default (ungrouped); read-only. @internal */
const EMPTY_GROUPING: GroupingState = []

/** Search-input placeholder when {@link GridSearch} supplies none. @internal */
const DEFAULT_SEARCH_PLACEHOLDER = 'Search'

/** Resolves a TanStack `Updater<S>` against a base value. @internal */
function applyUpdater<S>(updater: Updater<S>, base: S): S {
	return typeof updater === 'function' ? (updater as (prev: S) => S)(base) : updater
}

/** Server (manual) pagination is implied once a total is supplied. Exported for the grouping gates in `GridData`. @internal */
export function isManualPagination(config: GridPagination | undefined): boolean {
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
	/** The single column id the rows are grouped by, or `null`/absent for no grouping. */
	grouping?: (string | number) | null
	/** Engine expansion state for the grouped rows (which groups are open). */
	expanded?: ExpandedState
	/** Commits an engine-driven expansion change (a group header toggle) as a resolved value. */
	onExpandedChange?: (next: ExpandedState) => void
	/**
	 * Marks a row as a manual-grouping group header, or `null`/absent outside
	 * manual grouping. When set, the supplied rows are a consumer-shaped grouped
	 * sequence: the engine's client sort and filter transforms are forced manual
	 * (a client reorder would tear children from their headers), the core row
	 * model is materialized for the body's cells, and the row-model views split
	 * into the full display list ({@link UseGridTableResult.manualRows}) and the
	 * leaf-only `renderRows`/`rowKeys` backing selection and counts.
	 */
	manualGroupRow?: ((row: T) => boolean) | null
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
	/** Whether row grouping is active (a valid `grouping` column is set). */
	grouped: boolean
	/**
	 * The top-level group-header rows in display order (each with all its leaves on
	 * `subRows`) for the grouped body to render, or `null` when grouping is off. The
	 * body keeps the leaves mounted and animates them open/closed. {@link renderRows}
	 * / {@link rowKeys} still carry the flat leaf set for selection and counts.
	 */
	groupedRows: Row<T>[] | null
	/**
	 * The full display list — consumer-supplied group headers interleaved with
	 * leaves, in supplied order — under manual grouping, or `null` otherwise.
	 * The manual grouped body renders from it; {@link renderRows} /
	 * {@link rowKeys} carry only the leaves, so selection and the data counts
	 * never see a header row.
	 */
	manualRows: Row<T>[] | null
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
function useStableColumnDefs<T>(
	columns: GridColumn<T>[],
	smartSortingFn: SortingFn<unknown>,
): ColumnDef<T>[] {
	const columnsById = useMemo(
		() => new Map(columns.map((col) => [String(col.id), col] as const)),
		[columns],
	)

	const columnsByIdRef = useRef(columnsById)

	columnsByIdRef.current = columnsById

	const cellRenderers = useRef(new Map<string, (info: CellContext<T, unknown>) => ReactNode>())

	return useMemo<ColumnDef<T>[]>(() => {
		const defs = columns.map((col) => {
			const id = String(col.id)

			let renderCell = cellRenderers.current.get(id)

			if (!renderCell) {
				renderCell = (info) => columnsByIdRef.current.get(id)?.cell?.(info.row.original) ?? null

				cellRenderers.current.set(id, renderCell)
			}

			return {
				...toColumnDef(col, smartSortingFn),
				meta: { gridColumn: col },
				...(col.cell ? { cell: renderCell } : {}),
			}
		})

		// Drop renderers for columns no longer present, so the cache doesn't grow
		// unbounded across the mount as the column set changes.
		for (const id of cellRenderers.current.keys()) {
			if (!columnsById.has(id)) cellRenderers.current.delete(id)
		}

		return defs
	}, [columns, columnsById, smartSortingFn])
}

/**
 * Resolves the engine's row-grouping slice from the grouped column id and the
 * expansion state: the `grouped` flag, TanStack's `GroupingState` (a one-element
 * array of the grouped column id, or empty), the resolved `expanded` state
 * (defaulting to all-expanded), and the change handlers. Grouping is driven only
 * by the `groupBy` binding, so `onGroupingChange` is a no-op keeping the
 * controlled state stable; expansion writes back through `onExpandedChange`.
 *
 * @internal
 */
function useGroupingSlice(
	grouping: (string | number) | null,
	expanded: ExpandedState | undefined,
	onExpandedChange: ((next: ExpandedState) => void) | undefined,
) {
	const grouped = grouping != null

	const groupingState = useMemo<GroupingState>(
		() => (grouped ? [String(grouping)] : EMPTY_GROUPING),
		[grouped, grouping],
	)

	const resolvedExpanded = expanded ?? true

	const onGroupingChange = useCallback<OnChangeFn<GroupingState>>(() => {}, [])

	const onExpanded = useCallback<OnChangeFn<ExpandedState>>(
		(updater) => onExpandedChange?.(applyUpdater(updater, resolvedExpanded)),
		[onExpandedChange, resolvedExpanded],
	)

	return { grouped, groupingState, resolvedExpanded, onGroupingChange, onExpanded }
}

/**
 * Collapses the engine's display rows to their flat leaf set. Under grouping the
 * display rows carry group headers and only the expanded leaves, so each group
 * expands to its full leaf set (whatever its expansion) to recover every data
 * row; ungrouped display rows are already the leaves, and `null` passes through.
 *
 * @internal
 */
function deriveLeafRows<T>(displayRows: Row<T>[] | null, grouped: boolean): Row<T>[] | null {
	if (!displayRows) return null

	if (!grouped) return displayRows

	return displayRows.flatMap((row) => (row.getIsGrouped() ? row.getLeafRows() : [row]))
}

/**
 * Derives the row-model views the body reads: the grouped display list
 * (`groupedRows` — group headers interleaved with expanded leaves, or `null`
 * when ungrouped) and the flat `renderRows`/`rowKeys` backing selection identity
 * and the data count. `getRowModel().rows` is reference-stable until the sort/
 * filter/pagination/grouping state changes, so memoizing on it keeps these —
 * and the `rowIndexMap` GridData derives from them — stable across unrelated
 * re-renders (resize-drag frames, selection toggles, search keystrokes).
 *
 * Each key is taken from the engine's original-data row index (`leaf.index`,
 * the index `getRowId` saw), not the rendered position: a client transform
 * reorders rows while their engine ids stay fixed to the original order, so a
 * rendered-index key would diverge from `getRowId` and miss the body's
 * `table.getRow(key)` lookups.
 *
 * @internal
 */
function useGridRowModel<T>(args: {
	table: Table<T>
	rows: T[]
	getKey: (row: T, index: number) => string | number
	grouped: boolean
	/** Manual-grouping group-header predicate; splits the display rows into headers and leaves. */
	manualGroupRow: ((row: T) => boolean) | null
	/** Whether a client transform (sort/filter/pagination/grouping) is active, so the engine model is read. */
	materialize: boolean
}): {
	groupedRows: Row<T>[] | null
	manualRows: Row<T>[] | null
	renderRows: T[]
	rowKeys: (string | number)[]
} {
	const { table, rows, getKey, grouped, manualGroupRow, materialize } = args

	const displayRows = materialize ? table.getRowModel().rows : null

	// Under manual grouping the display rows are the consumer's grouped sequence;
	// the leaf set drops the group-header rows so selection identity and the data
	// counts track the actual data rows.
	const leafRows = useMemo<Row<T>[] | null>(() => {
		if (displayRows && manualGroupRow)
			return displayRows.filter((row) => !manualGroupRow(row.original))

		return deriveLeafRows(displayRows, grouped)
	}, [displayRows, grouped, manualGroupRow])

	// The top-level group-header rows, in display order. Each carries every one of
	// its leaves on `subRows` (regardless of expansion), so the body can keep the
	// leaves mounted and animate them open/closed rather than mount/unmount them.
	const groupedRows = useMemo<Row<T>[] | null>(
		() => (grouped && displayRows ? displayRows.filter((row) => row.getIsGrouped()) : null),
		[grouped, displayRows],
	)

	const manualRows = manualGroupRow ? displayRows : null

	const renderRows = useMemo(
		() => (leafRows ? leafRows.map((leaf) => leaf.original) : rows),
		[leafRows, rows],
	)

	const rowKeys = useMemo<(string | number)[]>(
		() =>
			leafRows
				? leafRows.map((leaf) => getKey(leaf.original, leaf.index))
				: rows.map((row, index) => getKey(row, index)),
		[leafRows, rows, getKey],
	)

	return { groupedRows, manualRows, renderRows, rowKeys }
}

/**
 * Resolves the engine's sort and filter transform modes. Manual grouping forces
 * both manual: the supplied rows are a positional header/children sequence, and
 * a client reorder or prune would tear children from their group headers. Kept
 * out of {@link useGridTable} for its cognitive-complexity budget.
 *
 * @internal
 */
function resolveTransformModes(args: {
	manualGrouped: boolean
	sortManual: boolean
	globalConfigured: boolean
	hasColumnFilters: boolean
	globalManual: boolean | undefined
	columnManual: boolean | undefined
}): { clientSort: boolean; filterMode: { configured: boolean; manual: boolean } } {
	return {
		clientSort: !args.sortManual && !args.manualGrouped,
		filterMode: resolveFilterMode({
			globalConfigured: args.globalConfigured,
			hasColumnFilters: args.hasColumnFilters,
			globalManual: args.manualGrouped || args.globalManual,
			columnManual: args.manualGrouped || args.columnManual,
		}),
	}
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
	grouping = null,
	expanded,
	onExpandedChange,
	manualGroupRow = null,
	pagination: paginationConfig,
	resizable = false,
	columnSizing: columnSizingConfig,
	globalFilter: globalFilterConfig,
	columnFilters: columnFiltersConfig,
	containerRef,
	density,
}: UseGridTableParams<T>): UseGridTableResult<T> {
	// A live map of column id -> descending, read by the smart comparator at
	// compare time so empties sink under both directions. Held in a ref refreshed
	// each render so a sort-direction flip doesn't rebuild the column defs.
	const sortDescByIdRef = useRef<Record<string, boolean>>({})

	sortDescByIdRef.current = useMemo(() => {
		const map: Record<string, boolean> = {}

		for (const entry of sort ?? []) map[String(entry.column)] = entry.direction === 'desc'

		return map
	}, [sort])

	const smartSortingFn = useMemo(
		() => makeSmartSortingFn((columnId) => sortDescByIdRef.current[columnId] ?? false),
		[],
	)

	const columnDefs = useStableColumnDefs(columns, smartSortingFn)

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

	// Per-column hard floors the autosizer measures (a single-word header's full
	// width, a multi-word one's icons); a stable map the resize bounds and the
	// sizing clamp both read. Holding it here, above the engine, lets
	// `onColumnSizingChange` catch a drag below the floor before it lands.
	const columnFloorsRef = useRef<Map<string, number>>(new Map())

	const onColumnSizingChange = useCallback<OnChangeFn<ColumnSizingState>>(
		(updater) =>
			setColumnSizingState((prev) =>
				clampSizingToFloors(applyUpdater(updater, prev ?? EMPTY_SIZING), columnFloorsRef.current),
			),
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

	const { clientSort, filterMode } = resolveTransformModes({
		manualGrouped: manualGroupRow != null,
		sortManual,
		globalConfigured,
		hasColumnFilters,
		globalManual: globalFilterConfig?.manual,
		columnManual: columnFiltersConfig?.manual,
	})

	const onSortingChange = useCallback<OnChangeFn<SortingState>>(
		(updater) => setSort?.(toSortState(applyUpdater(updater, toSortingState(sort)))),
		[sort, setSort],
	)

	// Row grouping slice (grouped flag, engine `GroupingState`, expansion state and
	// handlers); factored out to keep this hook within its complexity budget.
	const { grouped, groupingState, resolvedExpanded, onGroupingChange, onExpanded } =
		useGroupingSlice(grouping, expanded, onExpandedChange)

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
			grouped,
			grouping: groupingState,
			expanded: resolvedExpanded,
			columnOrder: engineColumnOrder,
			columnVisibility,
		}),
		...(selectable ? { enableRowSelection: true } : {}),
		...paginationOptions<T>({ paginated, manual, config: paginationConfig, onPaginationChange }),
		...resizeOptions<T>({ resizable, onColumnSizingChange }),
		...sortOptions<T>({ clientSort, onSortingChange }),
		...groupingOptions<T>({ grouped, onGroupingChange, onExpandedChange: onExpanded }),
		...filterOptions<T>({
			configured: filterMode.configured,
			manual: filterMode.manual,
			onGlobalFilterChange: globalConfigured ? onGlobalFilterChange : undefined,
			onColumnFiltersChange: hasColumnFilters ? onColumnFiltersChange : undefined,
		}),
	})

	const visibleColumns = useVisibleColumns(table)

	// Materialize the row model only when a client-side transform is active (a
	// client sort/filter/pagination, or grouping); otherwise hand `rows` straight
	// to the body. The row-model derivation (display rows, grouped display list,
	// flat leaf rows, and the `renderRows`/`rowKeys` the body reads) lives in
	// `useGridRowModel`.
	const clientTransform = usesClientModel({
		paginated,
		paginationManual: manual,
		filtersConfigured: filterMode.configured,
		filtersManual: filterMode.manual,
		sortClient: clientSort,
		grouped,
	})

	const { groupedRows, manualRows, renderRows, rowKeys } = useGridRowModel({
		table,
		rows,
		getKey,
		grouped,
		manualGroupRow,
		// Manual grouping materializes the (untransformed) core model too: the
		// grouped body reads each leaf's engine cells.
		materialize: paginated || clientTransform || manualGroupRow != null,
	})

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
	const { sizeToFit, resetColumn } = useGridColumnAutoSize<T>({
		resizable,
		controlled: columnSizingConfig?.value != null,
		table,
		// Fit distributes width across the *visible* data columns, not the hidden ones.
		columns: visibleColumns,
		containerRef,
		density,
		columnFloors: columnFloorsRef.current,
	})

	const resize = useMemo<GridColumnResize | null>(
		() =>
			resizable
				? { ...buildColumnResize(table, columnFloorsRef.current), sizeToFit, reset: resetColumn }
				: null,
		[resizable, table, sizeToFit, resetColumn],
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
		grouped,
		groupedRows,
		manualRows,
		pagination,
		resize,
		globalFilter,
		filters,
		pinning,
	}
}
