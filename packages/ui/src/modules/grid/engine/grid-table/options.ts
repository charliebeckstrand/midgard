import type {
	ColumnFiltersState,
	ColumnOrderState,
	ColumnPinningState,
	ColumnSizingState,
	ColumnVisibilityState,
	columnResizingState,
	FilterFn,
	GroupingState,
	OnChangeFn,
	PaginationState,
	Row,
	RowData,
	SortFn,
	SortingState,
} from '@tanstack/react-table'
import { isDataColumn } from '../../../../utilities'
import { evaluateQuery } from '../../../query/engine/query-evaluate'
import { isQueryGroup } from '../../../query/engine/query-node'
import type { GridSortState } from '../../context'
import type { GridColumn, GridPagination } from '../../types'
import { columnAccessor } from '../grid-column/accessor'
import {
	DRAG_HANDLE_COLUMN_SIZE,
	EXPANDER_COLUMN_SIZE,
	SELECT_COLUMN_SIZE,
} from '../grid-constants'
import { compareSortKeys, type SortKey, toSortKey } from '../grid-sort/utilities'
import type { EngineColumnDef, EngineData, EngineOptions, GridFeatures } from './features'

/** Adapts the grid's ordered {@link GridSortState} list to a TanStack `SortingState`, priority order preserved. @internal */
export function toSortingState(sort: GridSortState[] | undefined): SortingState {
	return (sort ?? []).map((entry) => ({
		id: String(entry.column),
		desc: entry.direction === 'desc',
	}))
}

/** Adapts a TanStack `SortingState` back to the grid's ordered {@link GridSortState} list. @internal */
export function toSortState(sorting: SortingState): GridSortState[] {
	return sorting.map((entry) => ({ column: entry.id, direction: entry.desc ? 'desc' : 'asc' }))
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
		// The engine filters both surfaces through one model, so mode is table-wide:
		// manual if either surface requests it. Manual wins because letting the
		// client model run over server-bound filters would filter already-filtered
		// data. `useGridTable` warns (dev) when the two surfaces' flags disagree.
		manual: Boolean(args.globalManual || args.columnManual),
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

/**
 * Parses a column width to px. A number passes through. A string yields a
 * number only where it is a plain `px` or unitless value. A relative or `auto`
 * width returns `undefined`, which leaves the column on content sizing.
 *
 * @internal
 */
export function parsePxWidth(width: number | string | undefined): number | undefined {
	if (width == null) return undefined

	if (typeof width === 'number') return Number.isFinite(width) ? width : undefined

	const match = /^(\d+(?:\.\d+)?)(?:px)?$/.exec(width.trim())

	return match ? Number(match[1]) : undefined
}

/**
 * Column filter: evaluates the column's query tree against the row, reading the
 * cell through the column accessor. A non-query value imposes no filter, and an
 * empty tree auto-removes, so a half-built rule never hides rows.
 *
 * @internal
 */
const queryFilterFn: FilterFn<GridFeatures, RowData> = (
	row: Row<GridFeatures, RowData>,
	columnId,
	filterValue,
) => !isQueryGroup(filterValue) || evaluateQuery(filterValue, () => row.getValue(columnId))

queryFilterFn.autoRemove = (value) => !isQueryGroup(value) || value.children.length === 0

/**
 * Highlight-mode global filter: matches every row, so the quick-search query
 * marks cells (see {@link GridSearch.mode}) without pruning any row. The value
 * still lives in engine state for the highlighter to read. Column filters keep
 * their own {@link queryFilterFn}, so they prune independently of the search.
 *
 * @internal
 */
const passThroughGlobalFilterFn: FilterFn<GridFeatures, RowData> = () => true

/**
 * Each row's decorated {@link SortKey}, cached per column on the row. A sort
 * compares a row O(log N) times; without this the smart comparator would reparse
 * the value (the currency / percent / accounting regexes) on every comparison.
 * Keyed by the stable engine `Row` and resolved through the engine's own cached
 * `getValue`. A value is therefore decoded once per sort, and the entry falls
 * away with the row model when the data changes. A `WeakMap` holds no row alive.
 *
 * @internal
 */
const sortKeyCache = new WeakMap<Row<GridFeatures, RowData>, Map<string, SortKey>>()

/** This row's {@link SortKey} for `columnId`, decoded once on first use and reused across the sort's comparisons. @internal */
function rowSortKey(row: Row<GridFeatures, RowData>, columnId: string): SortKey {
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
 * Builds the default column sort: it orders rows by the smart {@link SortKey} of
 * their accessor value. Numbers, money, percentages, dates, and the like
 * therefore sort correctly out of the box rather than lexically. Each value is
 * decorated once per sort (see {@link rowSortKey}). Row-shape-agnostic; cast to
 * a column's row type.
 *
 * Direction-aware so empties sink to the end under both directions. The engine
 * negates a comparator's result for a `desc` column, and its `sortUndefined`
 * escape fires only for a literal `undefined`. A fixed empties-last sign would
 * therefore flip to empties-first on `desc`. Reading the live direction through
 * `isDescending`, the empty partition is pre-inverted so the engine's negation
 * lands empties last either way; the non-empty comparison negates normally.
 *
 * @param isDescending - Whether `columnId` currently sorts descending, read live
 *   at compare time so column defs needn't rebuild when the sort direction flips.
 * @internal
 */
export function makeSmartSortingFn(
	isDescending: (row: Row<GridFeatures, RowData>, columnId: string) => boolean,
): SortFn<GridFeatures, RowData> {
	return (rowA, rowB, columnId) => {
		const a = rowSortKey(rowA, columnId)

		const b = rowSortKey(rowB, columnId)

		const result = compareSortKeys(a, b)

		// Empties order the same regardless of direction; pre-invert so the engine's
		// desc negation lands them last either way.
		if (a.empty || b.empty) return isDescending(rowA, columnId) ? -result : result

		return result
	}
}

/**
 * Whether a column sorts descending in the engine that holds `row`. Each engine
 * row holds its table, and the table reads the sort state of the render in
 * progress.
 *
 * @internal
 */
function sortsDescending(row: Row<GridFeatures, RowData>, columnId: string): boolean {
	return row.table.atoms.sorting.get().some((entry) => entry.id === columnId && entry.desc)
}

/** The smart sort of each data column, with the direction read from the engine. @internal */
const smartSortFn = makeSmartSortingFn(sortsDescending)

/**
 * Resolves a column's engine behaviors from its declaration:
 *
 * - The sort/filter value `accessorFn` (an explicit `value`, else the row field
 *   named by a data column's id, so columns sort client-side out of the box).
 * - The engine `sortFn` (a column's manual `sortFn`, else the smart default; data
 *   columns only).
 * - The query `filterFn` (a filterable column with a value).
 *
 * Each is `undefined` when
 * the column opts out, so {@link toColumnDef} spreads only what applies. The
 * comparator and filter are row-shape agnostic, cast to the column's row type.
 *
 * @internal
 */
function deriveColumnBehavior<T>(
	col: GridColumn<T>,
	smartSortingFn: SortFn<GridFeatures, RowData>,
) {
	const { value, sortFn } = col

	// Data columns read through the shared accessor (value or id field); a
	// non-data column has no default accessor, only its explicit `value`.
	const accessorFn = isDataColumn(col) ? columnAccessor(col) : value

	const engineSortFn: SortFn<GridFeatures, EngineData<T>> | undefined = !isDataColumn(col)
		? undefined
		: sortFn
			? (rowA, rowB) => sortFn(rowA.original, rowB.original)
			: (smartSortingFn as SortFn<GridFeatures, EngineData<T>>)

	const filterFn: FilterFn<GridFeatures, EngineData<T>> | undefined =
		col.filterable && value ? (queryFilterFn as FilterFn<GridFeatures, EngineData<T>>) : undefined

	return { accessorFn, engineSortFn, filterFn }
}

/**
 * The natural width of a non-data column whose content the design system fixes: a checkbox, a
 * grip, a chevron.
 *
 * An `actions` column deliberately gets none. Its content is the consumer's: one text button,
 * a save/discard pair, a lone icon. Any number here would be a guess that is wrong for most of
 * them. The consequence is worth knowing before you write one. An `actions` column sits out
 * the autosizer's fit ({@link isAutoSized}). A `resizable` grid takes the engine
 * width verbatim through its fixed-layout colgroup, so the `w-px` on the cell never gets to
 * shrink anything. **A width-less `actions` column therefore renders at
 * {@link DEFAULT_COLUMN_SIZE}, not at its content width** — declare a `width` unless that is
 * what you want.
 *
 * @internal
 */
function affordanceColumnSize<T>(col: GridColumn<T>): number | undefined {
	if (col.selectable) return SELECT_COLUMN_SIZE

	if (col.dragHandle) return DRAG_HANDLE_COLUMN_SIZE

	if (col.expander) return EXPANDER_COLUMN_SIZE

	return undefined
}

/**
 * Maps a grid column to its engine `ColumnDef`: identity, the capability gates,
 * the resolved behaviors (see {@link deriveColumnBehavior}), and sizing bounds.
 *
 * @internal
 */
export function toColumnDef<T>(col: GridColumn<T>): EngineColumnDef<T> {
	// A width-less column takes the engine's 150px default; the selection,
	// drag-handle, and expander columns instead hold a natural affordance width so
	// they aren't that wide. (The non-resizable auto layout already sizes them to
	// content via `w-px`.)
	const size = parsePxWidth(col.width) ?? affordanceColumnSize(col)

	const { accessorFn, engineSortFn, filterFn } = deriveColumnBehavior(col, smartSortFn)

	return {
		id: String(col.id),
		// Only data columns resize; non-data columns (selection, actions, drag handle, expander) hold their width.
		enableResizing: isDataColumn(col),
		enableColumnFilter: Boolean(col.filterable && col.value),
		// Quick search stays scoped to columns that declare `value`.
		enableGlobalFilter: Boolean(col.value),
		enableSorting: Boolean(col.sortable),
		// Only data columns group (they carry the accessor grouping keys on); the
		// non-data columns (selection, actions, drag handle, expander) can't be a `groupBy` target.
		enableGrouping: isDataColumn(col),
		// The accessor feeds sort/filter without changing how the cell renders.
		...(accessorFn ? { accessorFn } : {}),
		// The engine sorts a literal `undefined` itself, before the sort function,
		// and its desc negation then puts it first. With this off, the sort
		// function orders it, as the off-engine sort does.
		...(engineSortFn ? { sortFn: engineSortFn, sortUndefined: false as const } : {}),
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

/**
 * Pagination slice of the table options. When pagination is off, the slice
 * sets `manualPagination`, so the registered paginated row model passes every
 * row through (see `gridFeatures`).
 *
 * @internal
 */
export function paginationOptions<T>(args: {
	paginated: boolean
	manual: boolean
	config: GridPagination | undefined
	onPaginationChange: OnChangeFn<PaginationState>
}): Partial<EngineOptions<T>> {
	if (!args.paginated) return { manualPagination: true }

	return {
		onPaginationChange: args.onPaginationChange,
		...(args.manual ? { manualPagination: true, ...manualTotals(args.config) } : {}),
	}
}

/**
 * Filter slice of the table options. When filtering is off or manual, the
 * slice sets `manualFiltering`, so the registered filtered row model passes
 * every row through (see `gridFeatures`).
 *
 * @internal
 */
export function filterOptions<T>(args: {
	configured: boolean
	manual: boolean
	/** Highlight mode: the global search marks rather than prunes, so its filter matches every row. */
	globalHighlight?: boolean
	onGlobalFilterChange?: OnChangeFn<string>
	onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>
}): Partial<EngineOptions<T>> {
	if (!args.configured) return { manualFiltering: true }

	return {
		globalFilterFn: args.globalHighlight
			? (passThroughGlobalFilterFn as FilterFn<GridFeatures, EngineData<T>>)
			: 'includesString',
		...(args.onGlobalFilterChange ? { onGlobalFilterChange: args.onGlobalFilterChange } : {}),
		...(args.onColumnFiltersChange ? { onColumnFiltersChange: args.onColumnFiltersChange } : {}),
		// Manual mode sees only the server page, so the facets stand down there too
		// (see `columnFilterActions`).
		...(args.manual ? { manualFiltering: true } : {}),
	}
}

/**
 * Client-sort slice of the table options. When the consumer sorts, the slice
 * sets `manualSorting`, so the registered sorted row model passes every row
 * through (see `gridFeatures`).
 *
 * @internal
 */
export function sortOptions<T>(args: {
	clientSort: boolean
	onSortingChange: OnChangeFn<SortingState>
}): Partial<EngineOptions<T>> {
	if (!args.clientSort) return { manualSorting: true }

	return {
		onSortingChange: args.onSortingChange,
		// The grid owns the additive Shift-click model, so the engine must honor a
		// multi-column sorting state rather than collapse it to one column.
		enableMultiSort: true,
	}
}

/**
 * Row-grouping slice of the table options. Grouping is client-side only
 * (`manualGrouping: false`), so the engine collects the groups from the
 * filtered rows itself. When grouping is off, the slice sets `manualGrouping`,
 * so the registered grouped row model passes every row through. The engine has
 * no expanded row model: the grid opens the groups itself, so the display rows
 * of the engine are the group rows alone.
 *
 * @internal
 */
export function groupingOptions<T>(args: {
	grouped: boolean
	onGroupingChange: OnChangeFn<GroupingState>
}): Partial<EngineOptions<T>> {
	if (!args.grouped) return { manualGrouping: true }

	return {
		onGroupingChange: args.onGroupingChange,
		manualGrouping: false,
	}
}

/** Column-resize slice of the table options, or `{}` when resizing is off. @internal */
export function resizeOptions<T>(args: {
	resizable: boolean
	onColumnSizingChange: OnChangeFn<ColumnSizingState>
	onColumnSizingInfoChange: OnChangeFn<columnResizingState>
}): Partial<EngineOptions<T>> {
	if (!args.resizable) return {}

	return {
		enableColumnResizing: true,
		columnResizeMode: 'onChange',
		onColumnSizingChange: args.onColumnSizingChange,
		onColumnResizingChange: args.onColumnSizingInfoChange,
	}
}

/**
 * Raises each width in a column-sizing update to its measured floor, so a
 * drag-resize can't pull a column below the width its header needs. A
 * single-word header stays whole (it never truncates), and a multi-word one
 * keeps its affordance icons. The engine's resize handler writes the dragged
 * width clamped only at zero (the `minSize` floor is applied later, at read
 * time). Every write — drag, keyboard, autosizer — funnels through here. This
 * is therefore the one place a sub-floor width is caught before it reaches the
 * controlled state.
 *
 * `floors` carries only the columns the autosizer has measured. A column without
 * an entry (none recorded yet, or width-controlled) is left to the engine's own
 * `minSize`. Returns the input object unchanged when nothing sits below its
 * floor. The autosizer's no-op ticks therefore don't churn a fresh object
 * through the controlled state, and re-render the grid for nothing.
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
	columnResizing?: columnResizingState
	globalFilter?: string
	columnFilters?: ColumnFiltersState
	sorting?: SortingState
	columnPinning?: ColumnPinningState
	grouping?: GroupingState
	columnOrder: ColumnOrderState
	columnVisibility: ColumnVisibilityState
}

/** The controlled state slices the active features own. @internal */
export function buildState(args: {
	paginated: boolean
	pagination: PaginationState
	resizable: boolean
	sizing: ColumnSizingState
	sizingInfo: columnResizingState
	globalFiltered: boolean
	globalFilter: string
	columnFiltered: boolean
	columnFilters: ColumnFiltersState
	sortClient: boolean
	sorting: SortingState
	pinned: boolean
	columnPinning: ColumnPinningState
	grouped: boolean
	grouping: GroupingState
	columnOrder: ColumnOrderState
	columnVisibility: ColumnVisibilityState
}): GridControlledState {
	const state: GridControlledState = {
		columnOrder: args.columnOrder,
		columnVisibility: args.columnVisibility,
	}

	if (args.paginated) state.pagination = args.pagination

	if (args.resizable) {
		state.columnSizing = args.sizing

		state.columnResizing = args.sizingInfo
	}

	if (args.globalFiltered) state.globalFilter = args.globalFilter

	if (args.columnFiltered) state.columnFilters = args.columnFilters

	if (args.grouped) state.grouping = args.grouping

	if (args.sortClient) state.sorting = args.sorting

	if (args.pinned) state.columnPinning = args.columnPinning

	return state
}
