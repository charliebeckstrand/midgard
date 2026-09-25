'use client'

// The engine boundary. TanStack keeps one core table for the life of the grid,
// and its rows, columns, and headers also keep their identity. Their reads are
// live. The React Compiler caches a value on the identity of its inputs, so a
// compiled read of one of these objects goes stale. This module is the only
// grid module that reads the table during render, and it reads the table object
// of the render. `useTable` gives a new table object when its options or its
// state change, so a compiled read of that object stays current. It gives the
// grid values and actions only. A value is immutable, and a new value comes with
// each change. An action reads or writes the engine when it runs, and the render
// code calls it only from an event or an effect.

import {
	type ColumnFiltersState,
	type ColumnOrderState,
	type ColumnPinningState,
	type ColumnSizingState,
	type ColumnVisibilityState,
	type columnResizingState,
	type ExpandedState,
	functionalUpdate,
	type GroupingState,
	type OnChangeFn,
	type PaginationState,
	type SortingState,
	useTable,
} from '@tanstack/react-table'
import {
	type Dispatch,
	type RefObject,
	type SetStateAction,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { useControllable } from '../../hooks'
import type { DensityLevel } from '../../providers/density/context'
import { isDataColumn } from '../../utilities'
import type { GridSortState } from './context'
import { columnAccessor } from './engine/grid-column/accessor'
import {
	type ColumnTests,
	compileColumnFilters,
	filterRowIndices,
	type RowTest,
	uniqueValues,
} from './engine/grid-filter/filter'
import { groupRows } from './engine/grid-group/client'
import {
	expandGroups,
	type GridGroup,
	type GridLeaf,
	toggleGroupExpanded,
	toRowLeaf,
} from './engine/grid-group/tree'
import { isManualPagination, pageBounds } from './engine/grid-pagination-utilities'
import {
	EMPTY_FROZEN_LAYOUT,
	type FrozenLayout,
	frozenLayout,
	sameFrozenLayout,
	sameFrozenStructure,
} from './engine/grid-pin/layout'
import { createFrozenOffsetStore, writeFrozenOffsets } from './engine/grid-pin/offsets'
import { compileSearch } from './engine/grid-search/search'
import { createSettleStore, type GridSettleStore } from './engine/grid-sizing/settle'
import { cachedSortOrder, materializeSort, type SmartSortField } from './engine/grid-sort/utilities'
import {
	buildState,
	clampSizingToFloors,
	filterOptions,
	groupingOptions,
	paginationOptions,
	resizeOptions,
	resolveFilterMode,
	sortOptions,
	toColumnDef,
	toSortingState,
	toSortState,
} from './engine/grid-table/options'
import {
	DEFAULT_PAGINATION_STATE,
	DEFAULT_SEARCH_PLACEHOLDER,
	EMPTY_COLUMN_FILTERS,
	EMPTY_COLUMN_ORDER,
	EMPTY_GROUPING,
	EMPTY_SIZING,
	EMPTY_VISIBILITY,
	IDLE_SIZING_INFO,
	resolveClientView,
	resolveTransformModes,
	rowsSignatureOf,
} from './engine/grid-table/state'
import {
	buildColumnFilters,
	buildColumnPinning,
	buildColumnResize,
	buildPaginationView,
	columnFilterActions,
	columnResizeActions,
	columnWidths,
	type GridColumnFilter,
	type GridColumnPinning,
	type GridColumnResize,
	type GridColumnResizeActions,
	type GridGlobalFilterView,
	type GridPaginationView,
	sameElements,
	toColumnPinningState,
	toGridColumns,
} from './engine/grid-table/views'
import type {
	GridColumn,
	GridColumnFilterState,
	GridColumnFilters,
	GridColumnSizing,
	GridColumnSizingState,
	GridPagination,
	GridPaginationState,
	GridSearch,
} from './types'
import { useGridColumnSizing } from './use-grid-column-sizing'
import { useGridPinnedOffsets } from './use-grid-pinned-offsets'

export type {
	GridColumnFacets,
	GridColumnFilter,
	GridColumnPinning,
	GridColumnResize,
	GridGlobalFilterView,
	GridPaginationView,
} from './engine/grid-table/views'

import {
	type EngineColumn,
	type EngineColumnDef,
	type EngineData,
	type EngineOptions,
	type EngineTable,
	type GridFeatures,
	gridFeatures,
} from './engine/grid-table/features'

/** Parameters for {@link useGridTable}. @internal */
type GridTableParams<T> = {
	rows: T[]
	/** The full column set; the engine resolves which render (and in what order) from the order/visibility/pinning state below. */
	columns: GridColumn<T>[]
	getKey: (row: T, index: number) => string | number
	/** Selected row keys. An export takes the selected rows when there are any (see `rowsForExport`). */
	selection?: Set<string | number>
	/** Display order of the column ids; feeds the engine's `columnOrder`. Columns absent from it append in definition order. */
	columnOrder?: (string | number)[]
	/** Hidden-column map (`{ id: false }`) feeding the engine's `columnVisibility`. */
	columnVisibility?: ColumnVisibilityState
	sort?: GridSortState[]
	setSort?: (sort: GridSortState[]) => void
	sortManual?: boolean
	/** The single column id the rows are grouped by, or `null`/absent for no grouping. */
	grouping?: (string | number) | null
	/** Which groups are open. The grid owns this state, and the engine never reads it. */
	expanded?: ExpandedState
	/** Writes the expansion state; a group toggle writes through it as an update. */
	onExpandedChange?: Dispatch<SetStateAction<ExpandedState>>
	/**
	 * Marks a row as a manual-grouping group header, or `null`/absent outside
	 * manual grouping. When set, the supplied rows are a consumer-shaped grouped
	 * sequence. Three things follow:
	 *
	 * - The client sort and filter are forced manual, because a client reorder
	 *   would tear children from their headers.
	 * - The row views split into the full display list
	 *   ({@link GridTableResult.manualRows}) and the leaf-only
	 *   `renderRows`/`rowKeys` backing selection and counts.
	 */
	manualGroupRow?: ((row: T) => boolean) | null
	pagination?: GridPagination
	resizable?: boolean
	/** Size the columns to their content rather than to the container. @see {@link GridDataProps.width} */
	fitContent?: boolean
	/** Hold the auto-fit column widths steady against appended rows (infinite scroll); the initial fit, structural changes, and container resizes still apply. */
	stableColumnWidths?: boolean
	columnSizing?: GridColumnSizing
	globalFilter?: GridSearch
	columnFilters?: GridColumnFilters
	/** Grid wrapper element; measured to auto-size resizable columns to fill its width. */
	containerRef?: RefObject<HTMLElement | null>
	/** Table density; threaded to the autosizer, whose measurements scale with it. */
	density?: DensityLevel
	/**
	 * Whether a grand total aggregates the filtered rows. Only then does the grid
	 * collect {@link GridTableResult.grandTotalRows}.
	 */
	grandTotal?: boolean
}

/** Result of {@link useGridTable}: values and actions only. @internal */
type GridTableResult<T> = {
	/**
	 * Columns to render in resolved display order — the engine's visible leaf
	 * columns (order + visibility + pinning applied), mapped back to their source
	 * {@link GridColumn}. The header, body `<colgroup>`, and menus all read this.
	 */
	visibleColumns: GridColumn<T>[]
	/** Rows to render: the leaves of the groups, else the client view, else the supplied `rows`. */
	renderRows: T[]
	/**
	 * Per-row keys parallel to {@link renderRows}. Each is the value `getKey`
	 * yields at the row's engine (original-data) index, the index `getRowId` saw.
	 * Its stringified form therefore matches the id `table.getRow` is keyed by,
	 * while the raw `string | number` value still backs selection identity.
	 */
	rowKeys: (string | number)[]
	/** Whether row grouping is active (a valid `grouping` column is set). */
	grouped: boolean
	/**
	 * The groups in display order, each with all of its leaves, for the grouped
	 * body to render. `null` when grouping is off. The body keeps the leaves
	 * mounted and animates them open and closed. {@link renderRows} and
	 * {@link rowKeys} still carry the flat leaf set for selection and counts.
	 */
	groups: GridGroup<T>[] | null
	/** Opens or closes a group, by its id. */
	toggleGroup: (id: string) => void
	/**
	 * The full display list — consumer-supplied group headers interleaved with
	 * leaves, in supplied order — under manual grouping, or `null` otherwise.
	 * The manual grouped body renders from it; {@link renderRows} /
	 * {@link rowKeys} carry only the leaves, so selection and the data counts
	 * never see a header row.
	 */
	manualRows: GridLeaf<T>[] | null
	/** Footer view model, or `null` when pagination is not configured. */
	pagination: GridPaginationView | null
	/** Column-resize controls, or `null` when `resizable` is off. */
	resize: GridColumnResize | null
	/**
	 * The store of each visible column's settled width, for the body cells'
	 * truncation detector. A width is `undefined` for a column the grid does not
	 * size. It is also
	 * `undefined` for every column while a drag is in flight, so the cells hold
	 * frame to frame. A settled width then calls only the listeners of that
	 * column, and its visited cells measure their overflow again. No row renders
	 * again. A keyboard `nudge` moves the width with no drag, and counts the same.
	 * The store keeps one identity.
	 */
	settle: GridSettleStore
	/**
	 * Re-fits the columns when the body's rendered rows change and the last fit had
	 * none to measure. That is the windowed body's case, whose rows land in a later
	 * commit than the one that supplied them. Call from the body's layout effect,
	 * so the fit precedes the rows' first paint. A no-op once a fit has read rows,
	 * and when the autosizer stands down.
	 */
	fitRenderedRows: () => void
	/**
	 * Whether the first column-width pass has happened.
	 *
	 * `false` only between hydration and that pass, and only for a grid whose widths this
	 * hook sizes. The table holds its paint until it flips, so a reload never shows the
	 * declared widths and then replaces them with fitted ones — see `useGridColumnSizing`.
	 */
	widthsSettled: boolean
	/** Global-filter view, or `null` when filtering is not configured. */
	globalFilter: GridGlobalFilterView | null
	/** Per-column filter controls, or `null` when no column is filterable. */
	filters: GridColumnFilter | null
	/** Frozen-column controls, or `null` when no column is pinned. */
	pinning: GridColumnPinning | null
	/**
	 * The rows a grand total aggregates: the full filtered set. It holds all
	 * pages, because filtering precedes pagination, and the flat leaves, because
	 * it precedes grouping. Empty unless `grandTotal` is set.
	 */
	grandTotalRows: T[]
	/**
	 * Reads the rows an export takes, in display order. These are the selected
	 * rows when a selection is active, else the full filtered and sorted set (all
	 * pages). Both are the flat leaves, since the sorted model under grouping carries
	 * group headers rather than data rows.
	 */
	rowsForExport: () => T[]
}

/** Stable empty row set, so an inactive grand total holds its identity. @internal */
const NO_ROWS: never[] = []

/**
 * Holds a value at its previous reference while `same` reports the two equal. A
 * render that resolved the same facts therefore hands the memos below it the
 * identity they already hold.
 *
 * @remarks The held value is state. A value that `same` rejects updates the
 * state during render, so React renders the component again at once with the
 * new value, before it commits.
 *
 * @internal
 */
function useStableValue<T>(candidate: T, same: (previous: T, next: T) => boolean): T {
	const [stable, setStable] = useState(() => candidate)

	if (stable !== candidate && !same(stable, candidate)) {
		setStable(() => candidate)

		return candidate
	}

	return stable
}

/**
 * The engine's `ColumnDef[]` for the grid's columns. `meta` carries the source
 * column, so the engine's visible columns map back to it.
 *
 * @internal
 */
function toColumnDefs<T>(columns: GridColumn<T>[]): EngineColumnDef<T>[] {
	return columns.map((col) => ({ ...toColumnDef(col), meta: { gridColumn: col } }))
}

/**
 * Resolves the engine's row-grouping slice from the grouped column id. It gives
 * the `grouped` flag and TanStack's `GroupingState`, which is a one-element
 * array of the grouped column id, or empty. Grouping is driven only by the `groupBy`
 * binding, so `onGroupingChange` is a no-op keeping the controlled state stable.
 * The engine gets no expansion state: the grid opens its groups itself (see
 * {@link useGroupTree}).
 *
 * @internal
 */
function useGroupingSlice(grouping: (string | number) | null) {
	const grouped = grouping != null

	const groupingState = useMemo<GroupingState>(
		() => (grouped ? [String(grouping)] : EMPTY_GROUPING),
		[grouped, grouping],
	)

	const onGroupingChange = useCallback<OnChangeFn<GroupingState>>(() => {}, [])

	return { grouped, groupingState, onGroupingChange }
}

/**
 * The engine's drag state, held by the grid and updated at once.
 *
 * @remarks
 * A drag move fills the new widths inside the engine's `columnResizing`
 * updater, and then writes them through `onColumnSizingChange`. The width
 * binding applies its updater at once. React can defer an updater of the
 * engine's own state to the next render. That write then carries no width, so
 * the drag stays where it started. Held here, each drag update runs before the
 * width write reads it. The React Compiler changes which renders React defers,
 * which is how the fault showed.
 *
 * @returns The drag state and the handler that the engine writes it through.
 * @internal
 */
function useEagerSizingInfo(): [columnResizingState, OnChangeFn<columnResizingState>] {
	const [info, setInfo] = useState(IDLE_SIZING_INFO)

	const infoRef = useRef(info)

	const onChange = useCallback<OnChangeFn<columnResizingState>>((updater) => {
		const next = functionalUpdate(updater, infoRef.current)

		infoRef.current = next

		setInfo(next)
	}, [])

	return [info, onChange]
}

/**
 * The rows an export takes, from the client view: the selected leaves in
 * display order, else every leaf. A grouped grid takes the rows of its groups.
 * A manual grouping takes the rows around its headers. Any other grid takes
 * the rows of the view on every page.
 *
 * @remarks
 * The ids of the leaves are the stringified keys, so a selected key matches
 * its leaf as text. A selection of no shown row falls back to every leaf.
 *
 * @internal
 */
function viewLeaves<T>(args: {
	rows: T[]
	getKey: (row: T, index: number) => string | number
	groups: GridGroup<T>[] | null
	manualGroupRow: ((row: T) => boolean) | null
	clientView: ClientView<T> | null
	selection: ReadonlySet<string | number> | undefined
}): T[] {
	const { rows, getKey, groups, manualGroupRow, clientView } = args

	const leaves: GridLeaf<T>[] = groups
		? groups.flatMap((group) => group.leaves)
		: (clientView?.order ?? rows.map((_, index) => index)).flatMap((index) => {
				const row = rows[index] as T

				return manualGroupRow?.(row) ? [] : [toRowLeaf(row, index, getKey)]
			})

	// A leaf id is the key that `getRowId` stringified, so the keys compare as text.
	const keys = new Set(Array.from(args.selection ?? [], String))

	const selected = keys.size > 0 ? leaves.filter((leaf) => keys.has(leaf.id)) : []

	return (selected.length > 0 ? selected : leaves).map((leaf) => leaf.row)
}

/**
 * Derives the flat row views the body reads: the manual display list, and the
 * flat `renderRows`/`rowKeys` backing selection identity and the data count.
 * Each view is a memo over values that change only with the rows or a
 * transform. It therefore keeps its identity across an unrelated re-render,
 * such as a resize-drag frame or a selection toggle.
 *
 * Each key is taken at the row's original data index (the index `getRowId`
 * saw), not the rendered position. A client transform reorders rows while
 * their ids stay fixed to the original order. A rendered-index key would
 * therefore diverge from `getRowId`.
 *
 * @internal
 */
function useGridRowModel<T>(args: {
	rows: T[]
	getKey: (row: T, index: number) => string | number
	/** Manual-grouping group-header predicate; splits the rows into headers and leaves. */
	manualGroupRow: ((row: T) => boolean) | null
	/** The client view, or `null` when it applies no transform. */
	clientView: ClientView<T> | null
	/** The closed groups of a client-grouped grid, or `null`. */
	groups: GridGroup<T>[] | null
}): {
	manualRows: GridLeaf<T>[] | null
	renderRows: T[]
	rowKeys: (string | number)[]
} {
	const { rows, getKey, manualGroupRow, clientView, groups } = args

	// The leaves in display order when the grid collects them: the rows of its
	// groups, or the rows around the headers of a manual grouping.
	const leaves = useMemo<GridLeaf<T>[] | null>(() => {
		if (groups) return groups.flatMap((group) => group.leaves)

		if (!manualGroupRow) return null

		return rows.flatMap((row, index) =>
			manualGroupRow(row) ? [] : [toRowLeaf(row, index, getKey)],
		)
	}, [groups, manualGroupRow, rows, getKey])

	// The manual body segments the consumer's sequence by position, so it takes
	// every row, headers included, in data order.
	const manualRows = useMemo(
		() => (manualGroupRow ? rows.map((row, index) => toRowLeaf(row, index, getKey)) : null),
		[manualGroupRow, rows, getKey],
	)

	const renderRows = useMemo(
		() => (leaves ? leaves.map((leaf) => leaf.row) : (clientView?.rows ?? rows)),
		[leaves, clientView, rows],
	)

	const rowKeys = useMemo<(string | number)[]>(() => {
		if (leaves) return leaves.map((leaf) => leaf.key)

		return clientView?.keys ?? rows.map((row, index) => getKey(row, index))
	}, [leaves, clientView, rows, getKey])

	return { manualRows, renderRows, rowKeys }
}

/**
 * The groups of a client-grouped grid as values, and the action that opens or
 * closes one.
 *
 * @remarks
 * The grid collects the groups from its client view (see {@link groupRows}),
 * and opens them. The groups build once for each new view. A toggle then only
 * swaps the value of the group it toggles (see {@link expandGroups}).
 *
 * @internal
 */
function useGroupTree<T>(args: {
	rows: T[]
	columns: GridColumn<T>[]
	/** The client view, or `null` when it applies no transform. */
	clientView: ClientView<T> | null
	/** The sort of the grid, to order the groups. */
	sort: GridSortState[] | undefined
	/** The grouped column, or `null` when ungrouped. */
	grouping: string | number | null
	/** The expansion state; absent opens every group. */
	expanded: ExpandedState | undefined
	onExpandedChange: Dispatch<SetStateAction<ExpandedState>> | undefined
	getKey: (row: T, index: number) => string | number
}): {
	groups: GridGroup<T>[] | null
	closed: GridGroup<T>[] | null
	toggleGroup: (id: string) => void
} {
	const { rows, columns, clientView, sort, grouping, onExpandedChange, getKey } = args

	const columnId = grouping == null ? null : String(grouping)

	const expanded = args.expanded ?? true

	const closed = useMemo(() => {
		if (columnId == null) return null

		const column = columns.find((col) => String(col.id) === columnId)

		// A grouping by no column of the grid has no groups.
		if (!column) return []

		const fields = clientView?.fields ?? null

		return groupRows({
			rows,
			kept: clientView?.kept ?? null,
			order: clientView?.order ?? null,
			sort:
				fields && sort
					? { fields, grouped: sort.map((entry) => String(entry.column) === columnId) }
					: null,
			columnId,
			read: columnAccessor(column),
			getKey,
		})
	}, [columnId, columns, clientView, sort, rows, getKey])

	const groups = useMemo(() => (closed ? expandGroups(closed, expanded) : null), [closed, expanded])

	const toggleGroup = useCallback(
		(id: string) =>
			onExpandedChange?.((previous) =>
				toggleGroupExpanded(
					previous,
					id,
					(closed ?? []).map((group) => group.id),
				),
			),
		[onExpandedChange, closed],
	)

	return { groups, closed, toggleGroup }
}

/**
 * The client view: the client filters, the sort, and the client pagination,
 * which the grid runs itself. The engine builds no row model, so a filtered,
 * sorted, or paginated grid makes no row object for each datum. `null` when
 * the view applies no transform (see `resolveClientView`).
 *
 * The filter keeps the rows that pass the compiled column filters and the
 * quick search (see {@link compileColumnFilters} and {@link compileSearch}),
 * in one pass over the rows. The sort then orders those rows through
 * {@link cachedSortOrder}, and {@link materializeSort} reads each kept row at
 * its original index. The parity tests hold the result equal to the filtered
 * and sorted row models of a stock engine table.
 *
 * The sort columns are resolved to {@link SmartSortField}s in their own memo,
 * keyed on the sort and columns. A data change therefore re-sorts without
 * rebuilding the field list. The sort itself re-runs on that or a `rows` change.
 *
 * The page is a slice of the sorted order, in its own memo, with the bounds of
 * the paginated model of the engine. A page flip therefore reads only the rows
 * of the new page. `total` is the count of the rows before the slice.
 *
 * @internal
 */
function useClientView<T>(args: {
	rows: T[]
	getKey: (row: T, index: number) => string | number
	sort: GridSortState[] | undefined
	/** Whether the grid sorts client-side (a manual/server sort orders `rows` itself). */
	clientSort: boolean
	/** Whether the grid applies the client filters (see `resolveClientView`). */
	filtered: boolean
	/** The page of a client pagination, else `null`. */
	page: PaginationState | null
	/** The query of the quick search, or `''` when the search prunes no rows. */
	query: string
	/** The compiled column filters (see `compileColumnFilters`). */
	columnTests: ColumnTests<T>
	/** The full column set, to resolve each sort column's value accessor and any manual `sortFn`. */
	columns: GridColumn<T>[]
}): ClientView<T> | null {
	const { rows, getKey, sort, clientSort, filtered, page, query, columnTests, columns } = args

	// The sort columns as fields, or `null` unless a sort is the sole transform (a
	// client sort with entries and no engine transform already reshaping the rows).
	const fields = useMemo<SmartSortField<T>[] | null>(() => {
		if (!clientSort || !sort?.length) return null

		const byId = new Map(columns.map((col) => [String(col.id), col] as const))

		return sort.map((entry) => {
			const col = byId.get(String(entry.column))

			return {
				descending: entry.direction === 'desc',
				// The column's shared value accessor; a sort id with no matching
				// column (never, in practice) falls back to the raw field read.
				accessor: col
					? columnAccessor(col)
					: (row) => (row as Record<string | number, unknown>)[entry.column],
				sortFn: col?.sortFn ?? null,
			}
		})
	}, [clientSort, sort, columns])

	// The row tests of an off-engine filter, or `null` with none. The search
	// comes last, because it reads more cells than a column filter.
	const tests = useMemo<RowTest<T>[] | null>(() => {
		if (!filtered) return null

		const search = compileSearch(rows, columns, query)

		const byColumn = [...columnTests.values()]

		return search ? [...byColumn, search] : byColumn
	}, [filtered, rows, columns, query, columnTests])

	// The original indices of the rows that the filter keeps, and those rows.
	// Both are `null` with no off-engine filter.
	const kept = useMemo(() => (tests ? filterRowIndices(rows, tests) : null), [rows, tests])

	const keptRows = useMemo(
		() => (kept ? kept.map((index) => rows[index] as T) : null),
		[kept, rows],
	)

	// The permutation depends only on the rows and the sort spec, never on
	// `getKey`, so `cachedSortOrder` reuses it for a spec already seen. Its cache
	// is scoped to the rows that it sorts and to the columns, so a stale order can
	// never outlive the data or the accessors that it was computed against.
	// The original indices of the rows in view order, or `null` for data order.
	const order = useMemo(() => {
		const sorting = fields !== null && sort !== undefined && sort.length > 0

		if (!sorting) return kept

		const sig = sort.map((entry) => `${String(entry.column)}:${entry.direction}`).join('|')

		// The smart comparison is a total order, with the data index as the last
		// key. The order of a subset is then the full order with the other rows
		// taken out. The full order stays cached across the keystrokes of a
		// search, so a search filters it and sorts nothing. A custom `sortFn` can
		// break that rule, so its fields sort the kept rows.
		if (!kept || fields.every((field) => field.sortFn === null)) {
			const full = cachedSortOrder(rows, columns, sig, fields)

			return kept ? keepInOrder(full, kept, rows.length) : full
		}

		const local = cachedSortOrder(keptRows ?? rows, columns, sig, fields)

		// A sort of the kept rows gives positions among them. Each maps back to
		// the original index of its row.
		return local.map((position) => kept[position] as number)
	}, [fields, kept, keptRows, rows, sort, columns])

	const pageIndex = page?.pageIndex

	const pageSize = page?.pageSize

	return useMemo(() => {
		if (order === null && pageSize === undefined) return null

		const total = order?.length ?? rows.length

		// The engine keeps an empty set whole, and slices any other.
		const bounds =
			pageIndex === undefined || pageSize === undefined || total === 0
				? null
				: pageBounds(pageIndex, pageSize)

		const shown = bounds ? sliceOrder(order, total, bounds) : (order ?? identityOrder(total))

		return {
			...materializeSort(rows, shown, getKey),
			total,
			filtered: keptRows,
			kept,
			order,
			fields,
		}
	}, [order, pageIndex, pageSize, rows, getKey, keptRows, kept, fields])
}

/**
 * The rows of a {@link useClientView}, their keys, and the count before the
 * page slice.
 *
 * @internal
 */
type ClientView<T> = {
	rows: T[]
	keys: (string | number)[]
	total: number
	/** The rows that the filters keep, in data order, or `null` when the view applies no filter. */
	filtered: T[] | null
	/** The indices of {@link ClientView.filtered}, or `null`. */
	kept: number[] | null
	/** The indices of the view before the page slice, in view order, or `null` for data order. */
	order: number[] | null
	/** The fields of the client sort, or `null` when the view does not sort. */
	fields: SmartSortField<T>[] | null
}

/**
 * The indices of `order` that `kept` holds, in the sequence of `order`.
 *
 * @param count - The count of the rows that the indices point into.
 * @internal
 */
function keepInOrder(order: readonly number[], kept: readonly number[], count: number): number[] {
	const mask = new Uint8Array(count)

	for (const index of kept) mask[index] = 1

	return order.filter((index) => mask[index] === 1)
}

/** The indices `0` to `count - 1`, in order. @internal */
function identityOrder(count: number): number[] {
	return Array.from({ length: count }, (_, index) => index)
}

/**
 * The page of an order. With no order (data order), it builds only the
 * indices of the page, not the whole order.
 *
 * @internal
 */
function sliceOrder(
	order: number[] | null,
	total: number,
	[start, end]: [number, number],
): number[] {
	if (order) return order.slice(start, end)

	const last = Math.min(end, total)

	return start >= last ? [] : Array.from({ length: last - start }, (_, offset) => start + offset)
}

/**
 * Fires the column-resize drag lifecycle. The engine flags the column under an
 * active pointer/touch drag in `columnSizingInfo.isResizingColumn` (a keyboard
 * nudge writes the width straight through `columnSizing` instead). A transition
 * off or onto a column id therefore brackets the drag. The outgoing column ends
 * first (a settle, or a pointer that slid onto another handle), then the
 * incoming one starts. Read from the engine and fired from an effect, keeping the
 * callbacks out of the controlled-state write path. Kept out of
 * {@link useGridTable} for its cognitive-complexity budget.
 *
 * @internal
 */
function useColumnResizeLifecycle(
	resizable: boolean,
	isResizingColumn: string | false,
	onResizeStart: ((id: string) => void) | undefined,
	onResizeEnd: ((id: string) => void) | undefined,
): void {
	const resizingColumnId = resizable ? isResizingColumn : false

	const prevResizingRef = useRef<string | false>(false)

	useEffect(() => {
		const prev = prevResizingRef.current

		if (prev === resizingColumnId) return

		prevResizingRef.current = resizingColumnId

		if (prev) onResizeEnd?.(prev)

		if (resizingColumnId) onResizeStart?.(resizingColumnId)
	}, [resizingColumnId, onResizeStart, onResizeEnd])
}

/**
 * Warns (dev only) when the global search and the column filters are both
 * configured but their `manual` flags disagree. The engine filters both through
 * one table-wide model, so {@link resolveFilterMode} runs manual for both. The
 * client-side surface then silently stops filtering. Effect-scoped so it fires
 * once per config change, not every render. Kept out of {@link useGridTable} for its
 * cognitive-complexity budget.
 *
 * @internal
 */
function useFilterModeMismatchWarning(args: {
	globalConfigured: boolean
	hasColumnFilters: boolean
	globalManual: boolean | undefined
	columnManual: boolean | undefined
}): void {
	const { globalConfigured, hasColumnFilters, globalManual, columnManual } = args

	useEffect(() => {
		if (process.env.NODE_ENV === 'production') return

		if (!globalConfigured || !hasColumnFilters) return

		if (Boolean(globalManual) === Boolean(columnManual)) return

		console.warn(
			"Grid: the global search and column filters share one table-wide filtering mode, but their `manual` flags disagree. The grid runs manual (server) filtering for both, so the client-side surface won't filter locally — set both `manual` the same.",
		)
	}, [globalConfigured, hasColumnFilters, globalManual, columnManual])
}

/**
 * The visible columns and their widths. The engine resolves the visible leaf
 * columns from the order, visibility, and pinning state, frozen left, then
 * center, then frozen right. It memoizes each section on that state, so each
 * array keeps its identity until the state changes. The widths come from the
 * sizing state that the grid owns (see {@link columnWidths}).
 *
 * @internal
 */
function useColumnLayout<T>(
	table: EngineTable<T>,
	resizable: boolean,
	sizingState: ColumnSizingState,
) {
	// The engine reads no sizing state for a grid that does not resize.
	const sizing = resizable ? sizingState : EMPTY_SIZING

	const left = table.getStartVisibleLeafColumns()

	const center = table.getCenterVisibleLeafColumns()

	const right = table.getEndVisibleLeafColumns()

	const leaves = useMemo(() => [...left, ...center, ...right], [left, center, right])

	// Mapped back to their source `GridColumn`. The header, the body `<colgroup>`,
	// and the menus all read this.
	const visibleColumns = useMemo(() => toGridColumns(leaves), [leaves])

	const widths = useMemo(() => columnWidths(leaves, sizing), [leaves, sizing])

	return { left, right, leaves, visibleColumns, widths }
}

/** The column mid drag-resize in the drag state, or `null`. @internal */
function resizingColumn(resizable: boolean, info: columnResizingState): string | null {
	return resizable && info.isResizingColumn ? info.isResizingColumn : null
}

/**
 * The {@link GridColumnResize} value and the store of settled widths that the
 * body cells subscribe to (see {@link GridTableResult.settle}).
 *
 * @internal
 */
function useResizeView<T>(args: {
	resizable: boolean
	table: EngineTable<T>
	leaves: readonly EngineColumn<T>[]
	visibleColumns: GridColumn<T>[]
	widths: ReadonlyMap<string, number>
	/** The published floors, for the bounds. */
	floors: ReadonlyMap<string, number>
	/** The live floors, for a nudge. */
	columnFloors: ReadonlyMap<string, number>
	resizing: string | null
	sizer: Pick<GridColumnResizeActions, 'autoSizeColumn' | 'autoSizeAll' | 'resetWidths'> & {
		takeControl: () => void
	}
}): { resize: GridColumnResize | null; settle: GridSettleStore } {
	const { resizable, table, leaves, visibleColumns, widths, floors, columnFloors, resizing } = args

	const { autoSizeColumn, autoSizeAll, resetWidths, takeControl } = args.sizer

	const actions = useMemo<GridColumnResizeActions>(() => {
		const engine = columnResizeActions(table, columnFloors)

		return {
			startResize: engine.startResize,
			// A keyboard nudge takes manual control just like a drag: hold every column
			// so the nudge stays confined to its own column and survives the autosizer's
			// later triggers (container resize, page turn) instead of being re-fit away.
			nudge: (id, delta) => {
				engine.nudge(id, delta)

				takeControl()
			},
			autoSizeColumn,
			autoSizeAll,
			resetWidths,
		}
	}, [table, columnFloors, takeControl, autoSizeColumn, autoSizeAll, resetWidths])

	const resize = useMemo(
		() =>
			resizable ? buildColumnResize({ columns: leaves, widths, floors, resizing, actions }) : null,
		[resizable, leaves, widths, floors, resizing, actions],
	)

	// The widths as text, so a render that resolves the same widths keeps the
	// same map. A column with no settle width is `null` in the text.
	const settleKey = JSON.stringify(
		visibleColumns.map((col) => [
			String(col.id),
			resize && !resizing && isDataColumn(col) ? resize.getSize(col.id) : null,
		]),
	)

	const settleWidths = useMemo(
		() =>
			new Map(
				(JSON.parse(settleKey) as [string, number | null][]).map(([id, width]) => [
					id,
					width ?? undefined,
				]),
			),
		[settleKey],
	)

	const [settle] = useState(createSettleStore)

	// After the commit that moves the `<colgroup>`, so a cell that measures reads
	// the new width.
	const dragging = resizing != null

	useLayoutEffect(() => settle.publish(settleWidths, dragging), [settle, settleWidths, dragging])

	return { resize, settle }
}

/**
 * The {@link GridColumnFilter} value, or `null` when no column is filterable.
 *
 * @internal
 */
function useFilterView<T>(args: {
	table: EngineTable<T>
	enabled: boolean
	/** Whether the consumer filters, so the columns have no facets. */
	manual: boolean
	columns: GridColumn<T>[]
	applied: GridColumnFilterState[]
	affordance: GridColumnFilter['affordance'] | undefined
	/** The facet values of each column (see {@link useFacetSource}). */
	facetValues: (id: string) => Iterable<unknown>
}): GridColumnFilter | null {
	const { table, enabled, manual, columns, applied, facetValues } = args

	const affordance = args.affordance ?? 'header'

	// Which column's filter sheet the right-click menu asked to open (the `'menu'`
	// affordance), or `null`. Lives here because a table instance holds no such state.
	const [openColumn, setOpenColumn] = useState<string | number | null>(null)

	const actions = useMemo(
		() => columnFilterActions(table, manual, facetValues),
		[table, manual, facetValues],
	)

	return useMemo(
		() =>
			enabled
				? buildColumnFilters({
						columns,
						applied,
						actions,
						affordance,
						openColumn,
						requestOpen: setOpenColumn,
					})
				: null,
		[enabled, columns, applied, actions, affordance, openColumn],
	)
}

/**
 * The facet values of each column over one set of rows, filters, and query.
 * Each column collects its values on its first read, and keeps them.
 *
 * @remarks
 * A plain function, not a hook body, so that the cache of the values lives
 * with the source that fills it. The React Compiler can memoize an allocation
 * in a hook body on its own, which would share one cache among sources.
 *
 * @internal
 */
function facetSource<T>(
	rows: readonly T[],
	columns: readonly GridColumn<T>[],
	columnTests: ColumnTests<T>,
	query: string,
): (id: string) => Set<unknown> {
	const search = compileSearch(rows, columns, query)

	const byId = new Map(columns.map((col) => [String(col.id), col] as const))

	const cache = new Map<string, Set<unknown>>()

	return (id) => {
		let values = cache.get(id)

		if (!values) {
			const read = byId.get(id)?.value

			const tests = [...columnTests].flatMap(([other, test]) => (other === id ? [] : [test]))

			if (search) tests.push(search)

			values = read ? uniqueValues(rows, read, tests) : new Set()

			cache.set(id, values)
		}

		return values
	}
}

/**
 * The distinct cell values that the facets of each column read, which the
 * grid collects itself.
 *
 * @remarks
 * The facets of a column read the rows that pass the quick search and every
 * other column filter. The faceted row model of the engine reads the same
 * rows. The filter of the column itself does not apply, so its facets still
 * offer the values that it hides. A filter sheet reads the values when it
 * opens. The first read after a change of the rows, the filters, or the query
 * collects them.
 *
 * The function keeps one identity. It reads the source of the last commit, so
 * a search keystroke or a data change renders no filter button again.
 *
 * @returns A function that gives the values of a column.
 * @internal
 */
function useFacetSource<T>(args: {
	rows: T[]
	columns: GridColumn<T>[]
	columnTests: ColumnTests<T>
	/** The query of the quick search, or `''` when the search prunes no rows. */
	query: string
}): (id: string) => Iterable<unknown> {
	const { rows, columns, columnTests, query } = args

	const source = useMemo(
		() => facetSource(rows, columns, columnTests, query),
		[rows, columns, columnTests, query],
	)

	const latest = useRef(source)

	useLayoutEffect(() => {
		latest.current = source
	}, [source])

	return useCallback((id: string) => latest.current(id), [])
}

/**
 * The {@link GridColumnPinning} value, or `null` when no column is frozen.
 *
 * @remarks
 * A frozen column sticks at the summed width of the frozen columns ahead of it.
 * Those widths are the rendered ones only under the fixed-layout colgroup that
 * a resizable grid lays out from them. A non-resizable grid lays out `auto` and
 * sizes each column to its content, so there the offsets are measured from the
 * rendered header instead. Without that, a stack of frozen columns spreads apart
 * by the difference, and the scrolling columns show through the gaps.
 *
 * The view holds its reference while each frozen column keeps its edge and
 * its boundary role. A drag on a scrolling column therefore re-renders no row.
 * A drag that shifts the frozen stack also re-renders no row. The layout effect
 * commits the new layout to the offset store, and writes the moved offsets to
 * the frozen cells before the browser paints. A new render of the full view
 * cost about half of a frozen resize, over 1,000 rows or more.
 *
 * @internal
 */
function usePinningView<T>(args: {
	hasPinned: boolean
	resizable: boolean
	columnPinning: ColumnPinningState
	visibleColumns: GridColumn<T>[]
	containerRef: RefObject<HTMLElement | null> | undefined
	left: readonly EngineColumn<T>[]
	right: readonly EngineColumn<T>[]
	widths: ReadonlyMap<string, number>
}): GridColumnPinning | null {
	const { hasPinned, left, right, widths } = args

	const measured = useGridPinnedOffsets({
		frozen: hasPinned,
		engineSized: args.resizable,
		pinning: args.columnPinning,
		columns: args.visibleColumns,
		containerRef: args.containerRef,
	})

	const sections = {
		left: left.map((column) => column.id),
		right: right.map((column) => column.id),
	}

	const layout = useStableValue<FrozenLayout>(
		hasPinned ? frozenLayout(sections, widths, measured) : EMPTY_FROZEN_LAYOUT,
		sameFrozenLayout,
	)

	const structure = useStableValue<FrozenLayout>(layout, sameFrozenStructure)

	const [offsets] = useState(() => createFrozenOffsetStore(layout))

	const { containerRef } = args

	useLayoutEffect(() => {
		const previous = offsets.commit(layout)

		const container = containerRef?.current

		if (container && previous !== layout) writeFrozenOffsets(container, previous, layout)
	}, [offsets, layout, containerRef])

	return useMemo(
		() => (hasPinned ? buildColumnPinning(structure, offsets) : null),
		[hasPinned, structure, offsets],
	)
}

/**
 * The full filtered row set, for a grand total, in data order: the rows that
 * the filters of the client view keep, else every row. Empty unless a grand
 * total is active. Manual grouping carries the consumer's group headers as
 * rows, so it has no grand total (see `resolveGrandTotal`).
 *
 * @internal
 */
function grandTotalRowsOf<T>(args: {
	grandTotal: boolean
	manualGrouped: boolean
	clientView: ClientView<T> | null
	rows: T[]
}): T[] {
	if (!args.grandTotal || args.manualGrouped) return NO_ROWS

	return args.clientView?.filtered ?? args.rows
}

/**
 * Builds the {@link https://tanstack.com/table | TanStack Table} instance that
 * powers a {@link Grid}, and the row views of the grid. It adapts the grid's
 * `GridColumn[]` to TanStack `ColumnDef[]` (mapping `value` to an accessor) and
 * `getKey` to `getRowId`.
 *
 * @remarks The engine holds the column state (order, visibility, sizing,
 * pinning) and the state of the row transforms, and the actions that write
 * them. It builds no row model. The grid filters, sorts, groups, and pages its
 * rows itself (see {@link useClientView} and `groupRows`). Each transform is
 * opt-in, and pagination and filtering each run server-side (`manual`, the
 * consumer transforms `rows`) or client-side. A plain grid renders straight
 * from `rows`. `autoResetPageIndex` is off: the page is consumer-controlled.
 *
 * This hook is the engine boundary (see the note at the top of this module).
 * The grid owns every piece of table state, and the engine calculates from it.
 * The result carries no engine object: each field is a value or an action. Each
 * value is a `useMemo` over state the grid owns, or over a result that the
 * engine memoizes on that state. A dependency list therefore names what the
 * value reads.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function useGridTable<T>({
	rows,
	columns: suppliedColumns,
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
	fitContent = false,
	stableColumnWidths = false,
	columnSizing: columnSizingConfig,
	globalFilter: globalFilterConfig,
	columnFilters: columnFiltersConfig,
	containerRef,
	density,
	grandTotal = false,
}: GridTableParams<T>): GridTableResult<T> {
	// A fresh array of the same columns holds the previous reference. The engine
	// then keeps its columns, and every column-derived value keeps its identity.
	const columns = useStableValue(suppliedColumns, sameElements)

	// The smart comparator reads the sort direction from the engine when it runs,
	// so a direction flip does not rebuild the column definitions.
	const columnDefs = useMemo(() => toColumnDefs(columns), [columns])

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
			setPaginationState((prev) => functionalUpdate(updater, prev ?? DEFAULT_PAGINATION_STATE)),
		[setPaginationState],
	)

	// Held true by the autosizer around its own writes (see `useGridColumnSizing`),
	// so the content fit updates the engine's sizing state without surfacing through
	// the consumer's `onValueChange` — that binding reflects user/consumer intent
	// (a drag, a keyboard nudge, a controlled write), not the internal auto-fit.
	const autoSizingRef = useRef(false)

	const [columnSizingState, setColumnSizingState] = useControllable<GridColumnSizingState>({
		value: columnSizingConfig?.value,
		defaultValue: columnSizingConfig?.defaultValue ?? EMPTY_SIZING,
		onValueChange: (next) => {
			if (autoSizingRef.current) return

			columnSizingConfig?.onValueChange?.(next ?? {})
		},
	})

	const resolvedSizing = columnSizingState ?? EMPTY_SIZING

	// The consumer's binding, read at call time, so "Reset column widths" can clear
	// the saved widths without a new callback on each render. The effect keeps the
	// latest binding, and the callback reads it only when it runs.
	const sizingChangeRef = useRef(columnSizingConfig?.onValueChange)

	const onSizingChange = columnSizingConfig?.onValueChange

	useEffect(() => {
		sizingChangeRef.current = onSizingChange
	}, [onSizingChange])

	const clearSizingPreference = useCallback(() => sizingChangeRef.current?.({}), [])

	// The consumer-seeded widths (a restored/persisted sizing), captured once so the
	// autosizer can hold them on reload rather than measuring over them.
	const [initialSizing] = useState(
		() => columnSizingConfig?.value ?? columnSizingConfig?.defaultValue,
	)

	// Per-column hard floors the autosizer measures (a single-word header's full
	// width, a multi-word one's icons). The autosizer writes each measurement into
	// this one map, and the sizing clamp and a keyboard nudge read it when they
	// run. Holding it here, above the engine, lets `onColumnSizingChange` catch a
	// drag below the floor before it lands. The resize bounds read the copy that
	// the autosizer publishes.
	const [columnFloors] = useState(() => new Map<string, number>())

	const [columnSizingInfo, onColumnSizingInfoChange] = useEagerSizingInfo()

	const onColumnSizingChange = useCallback<OnChangeFn<ColumnSizingState>>(
		(updater) =>
			setColumnSizingState((prev) =>
				clampSizingToFloors(functionalUpdate(updater, prev ?? EMPTY_SIZING), columnFloors),
			),
		[setColumnSizingState, columnFloors],
	)

	const globalConfigured = globalFilterConfig != null

	const [globalFilterState, setGlobalFilterState] = useControllable<string>({
		value: globalFilterConfig?.value,
		defaultValue: globalFilterConfig?.defaultValue ?? '',
		onValueChange: (next) => globalFilterConfig?.onValueChange?.(next ?? ''),
	})

	const resolvedGlobalFilter = globalFilterState ?? ''

	const onGlobalFilterChange = useCallback<OnChangeFn<string>>(
		(updater) => setGlobalFilterState((prev) => functionalUpdate(updater, prev ?? '')),
		[setGlobalFilterState],
	)

	const hasColumnFilters = columns.some((col) => col.filterable && col.value)

	// Keyed on the public row type rather than TanStack's, whose `value` is
	// `unknown`. The grid's filter function evaluates a query tree, so the public
	// binding says so, and the narrower row is assignable to the engine's.
	const [columnFiltersState, setColumnFiltersState] = useControllable<GridColumnFilterState[]>({
		value: columnFiltersConfig?.value,
		defaultValue: columnFiltersConfig?.defaultValue ?? EMPTY_COLUMN_FILTERS,
		onValueChange: (next) => columnFiltersConfig?.onValueChange?.(next ?? []),
	})

	const resolvedColumnFilters = columnFiltersState ?? EMPTY_COLUMN_FILTERS

	// The one narrowing in the binding, and the only place it is needed. TanStack
	// types a filter's value `unknown`; every value this grid writes is the query
	// tree its own filter function evaluates, which is what the public
	// `GridColumnFilterState` says. The engine's updater cannot carry that, so the
	// assertion sits here rather than widening the public type back to `unknown`.
	const onColumnFiltersChange = useCallback<OnChangeFn<ColumnFiltersState>>(
		(updater) =>
			setColumnFiltersState(
				(prev) =>
					functionalUpdate(updater, prev ?? EMPTY_COLUMN_FILTERS) as GridColumnFilterState[],
			),
		[setColumnFiltersState],
	)

	const { clientSort, filterMode, globalHighlights } = resolveTransformModes({
		manualGrouped: manualGroupRow != null,
		sortManual,
		globalConfigured,
		hasColumnFilters,
		globalManual: globalFilterConfig?.manual,
		columnManual: columnFiltersConfig?.manual,
		globalFiltersRows: globalFilterConfig?.mode !== 'highlight',
	})

	// The engine filters the global search and the column filters through one
	// model, so filtering mode is table-wide — it can't be client for one surface
	// and server for the other; warn (dev) when both are configured but their
	// `manual` flags disagree.
	useFilterModeMismatchWarning({
		globalConfigured,
		hasColumnFilters,
		globalManual: globalFilterConfig?.manual,
		columnManual: columnFiltersConfig?.manual,
	})

	const onSortingChange = useCallback<OnChangeFn<SortingState>>(
		(updater) => setSort?.(toSortState(functionalUpdate(updater, toSortingState(sort)))),
		[sort, setSort],
	)

	// Row grouping slice (grouped flag, engine `GroupingState`, expansion state and
	// handlers); factored out to keep this hook within its complexity budget.
	const { grouped, groupingState, onGroupingChange } = useGroupingSlice(grouping)

	// Frozen columns, keyed off each column's `locked` or `pinned` flag. The engine pulls them
	// to their edge via `columnPinning`, so these id lists drive the sticky order.
	const { state: columnPinning, hasPinned } = useMemo(
		() => toColumnPinningState(columns),
		[columns],
	)

	// Engine column-order state: the display order as string ids (columns absent
	// from it append in definition order). Visibility defaults to all-visible.
	const engineColumnOrder = useMemo<ColumnOrderState>(() => columnOrder.map(String), [columnOrder])

	const getRowId = useCallback((row: T, index: number) => String(getKey(row, index)), [getKey])

	const sorting = useMemo(() => toSortingState(sort), [sort])

	// The column filters that reach the engine. A grid with no filterable column
	// gives the engine no filter state, so its filters apply to no row. This block
	// comes before the engine options. The React Compiler reads a plain call after
	// a memo as a possible change to the inputs of the memo, and then skips this
	// hook (see `react-compiler-skips.json`).
	const appliedColumnFilters = hasColumnFilters ? resolvedColumnFilters : EMPTY_COLUMN_FILTERS

	const columnTests = useMemo(
		() => compileColumnFilters(columns, appliedColumnFilters),
		[columns, appliedColumnFilters],
	)

	const clientTransforms = resolveClientView({
		paginated,
		paginationManual: manual,
		pagination: resolvedPagination,
		filterMode,
		globalFiltered: globalConfigured,
		globalFilter: resolvedGlobalFilter,
		globalHighlights,
		columnFilters: appliedColumnFilters,
	})

	// The engine options, as one value. The engine copies the table into a new
	// table object each time the options change, so a render that changes no
	// input keeps the options and skips that copy.
	const options = useMemo<EngineOptions<T>>(
		() => ({
			features: gridFeatures,
			data: rows as EngineData<T>[],
			columns: columnDefs,
			getRowId,
			// The page coordinate, widths, and query are owned by controllable bindings.
			autoResetPageIndex: false,
			state: buildState({
				paginated,
				pagination: resolvedPagination,
				resizable,
				sizing: resolvedSizing,
				sizingInfo: columnSizingInfo,
				globalFiltered: globalConfigured,
				globalFilter: resolvedGlobalFilter,
				columnFiltered: hasColumnFilters,
				columnFilters: resolvedColumnFilters,
				sortClient: clientSort,
				sorting,
				pinned: hasPinned,
				columnPinning,
				grouped,
				grouping: groupingState,
				columnOrder: engineColumnOrder,
				columnVisibility,
			}),
			...paginationOptions<T>({ paginated, manual, config: paginationConfig, onPaginationChange }),
			...resizeOptions<T>({ resizable, onColumnSizingChange, onColumnSizingInfoChange }),
			...sortOptions<T>({ clientSort, onSortingChange }),
			...groupingOptions<T>({ grouped, onGroupingChange }),
			...filterOptions<T>({
				configured: filterMode.configured,
				onGlobalFilterChange: globalConfigured ? onGlobalFilterChange : undefined,
				onColumnFiltersChange: hasColumnFilters ? onColumnFiltersChange : undefined,
			}),
		}),
		[
			rows,
			columnDefs,
			getRowId,
			paginated,
			resolvedPagination,
			resizable,
			resolvedSizing,
			columnSizingInfo,
			globalConfigured,
			resolvedGlobalFilter,
			hasColumnFilters,
			resolvedColumnFilters,
			clientSort,
			sorting,
			hasPinned,
			columnPinning,
			grouped,
			groupingState,
			engineColumnOrder,
			columnVisibility,
			manual,
			paginationConfig,
			onPaginationChange,
			onColumnSizingChange,
			onColumnSizingInfoChange,
			onSortingChange,
			onGroupingChange,
			filterMode.configured,
			onGlobalFilterChange,
			onColumnFiltersChange,
		],
	)

	// The table of this render. Its identity changes with its options and its
	// state, so the render reads below read it.
	const table = useTable<GridFeatures, EngineData<T>>(options)

	// The engine: a table object that keeps one identity. Its methods act on the
	// one core table, so an action or an effect reads it when it runs. Its
	// `options` and `state` fields are those of the first render, so no code
	// reads them. `engine-handle-boundary.test.ts` holds that only an action or
	// an effect reads it.
	const [engine] = useState(() => table)

	const { left, right, leaves, visibleColumns, widths } = useColumnLayout(
		table,
		resizable,
		resolvedSizing,
	)

	const resizing = resizingColumn(resizable, columnSizingInfo)

	// A search that only marks its matches prunes no row.
	const searchQuery = globalConfigured && !globalHighlights ? resolvedGlobalFilter : ''

	// The grid filters, sorts, and pages its rows itself, and the engine builds
	// no row model. The row views that the body reads (the groups, the manual
	// display list, and `renderRows`/`rowKeys`) derive from this view.
	const clientView = useClientView({
		rows,
		getKey,
		sort,
		clientSort,
		filtered: clientTransforms.filtered,
		page: clientTransforms.page,
		query: searchQuery,
		columnTests,
		columns,
	})

	const { groups, closed, toggleGroup } = useGroupTree({
		rows,
		columns,
		clientView,
		sort,
		grouping,
		expanded,
		onExpandedChange,
		getKey,
	})

	const { manualRows, renderRows, rowKeys } = useGridRowModel({
		rows,
		getKey,
		manualGroupRow,
		clientView,
		groups: closed,
	})

	// Built on each render, so the totals follow the client filters. A new value
	// each render is correct, and the footer is cheap.
	const pagination = paginationConfig
		? buildPaginationView({
				table: engine,
				pagination: resolvedPagination,
				manual,
				config: paginationConfig,
				rows: clientView?.total ?? rows.length,
				pageRowCount: renderRows.length,
			})
		: null

	// Size resizable columns to their content and fill the container, unless widths
	// are controlled. The hook also backs the header menu's width actions.
	const {
		autoSizeColumn,
		autoSizeAll,
		resetWidths,
		takeControl,
		fitRenderedRows,
		settled: widthsSettled,
		floors,
	} = useGridColumnSizing<T>({
		resizable,
		controlled: columnSizingConfig?.value != null,
		table: engine,
		// Fit distributes width across the *visible* data columns, not the hidden ones.
		columns: visibleColumns,
		containerRef,
		// Fingerprint from the keys the grid already derived, so the autosizer
		// never walks the rows just to notice a row change.
		rowsSignature: rowsSignatureOf(rowKeys),
		density,
		fitContent,
		resizing,
		columnFloors,
		// Infinite scroll's stable widths hold the fit against each appended batch.
		freezeOnRowChange: stableColumnWidths,
		// Restored/persisted widths start held, and the autosizer flags its own
		// writes so they stay off the consumer's `onValueChange`.
		initialSizing,
		autoSizingRef,
		clearPreference: clearSizingPreference,
	})

	const { resize, settle } = useResizeView({
		resizable,
		table: engine,
		leaves,
		visibleColumns,
		widths,
		floors,
		columnFloors,
		resizing,
		sizer: { autoSizeColumn, autoSizeAll, resetWidths, takeControl },
	})

	useColumnResizeLifecycle(
		resizable,
		columnSizingInfo.isResizingColumn,
		columnSizingConfig?.onResizeStart,
		columnSizingConfig?.onResizeEnd,
	)

	const globalFilter = useMemo<GridGlobalFilterView | null>(
		() =>
			globalConfigured
				? {
						value: resolvedGlobalFilter,
						setValue: (value: string) => engine.setGlobalFilter(value),
						placeholder: globalFilterConfig?.placeholder ?? DEFAULT_SEARCH_PLACEHOLDER,
					}
				: null,
		[globalConfigured, resolvedGlobalFilter, globalFilterConfig, engine],
	)

	const facetValues = useFacetSource({ rows, columns, columnTests, query: searchQuery })

	const filters = useFilterView({
		table: engine,
		enabled: hasColumnFilters,
		manual: filterMode.manual,
		columns,
		applied: resolvedColumnFilters,
		affordance: columnFiltersConfig?.affordance,
		facetValues,
	})

	const pinning = usePinningView({
		hasPinned,
		resizable,
		columnPinning,
		visibleColumns,
		containerRef,
		left,
		right,
		widths,
	})

	const grandTotalRows = grandTotalRowsOf({
		grandTotal,
		manualGrouped: manualGroupRow != null,
		clientView,
		rows,
	})

	const rowsForExport = useCallback(
		() => viewLeaves({ rows, getKey, groups: closed, manualGroupRow, clientView, selection }),
		[manualGroupRow, selection, rows, getKey, closed, clientView],
	)

	return {
		visibleColumns,
		renderRows,
		rowKeys,
		grouped,
		groups,
		toggleGroup,
		manualRows,
		pagination,
		resize,
		settle,
		fitRenderedRows,
		widthsSettled,
		globalFilter,
		filters,
		pinning,
		grandTotalRows,
		rowsForExport,
	}
}
