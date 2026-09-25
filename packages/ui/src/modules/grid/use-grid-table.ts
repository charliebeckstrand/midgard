'use client'

// The engine boundary. TanStack's table is one mutable object that keeps its
// identity across renders, and its reads are live. The React Compiler caches a
// value on the identity of its inputs, so a compiled read of the table goes
// stale. This module is therefore the one grid module that the compiler does not
// transform, and the only one that reads the table during render. It gives the
// grid values and actions only. A value is immutable, and a new value comes with
// each change. An action reads or writes the engine when it runs, and the render
// code calls it only from an event or an effect.
'use no memo'

import {
	type Column,
	type ColumnDef,
	type ColumnFiltersState,
	type ColumnOrderState,
	type ColumnPinningState,
	type ColumnSizingInfoState,
	type ColumnSizingState,
	type ExpandedState,
	functionalUpdate,
	type GroupingState,
	getCoreRowModel,
	type OnChangeFn,
	type PaginationState,
	type Row,
	type RowData,
	type SortingFn,
	type SortingState,
	type Table,
	useReactTable,
	type VisibilityState,
} from '@tanstack/react-table'
import {
	type Dispatch,
	type RefObject,
	type SetStateAction,
	useCallback,
	useEffect,
	useEffectEvent,
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
	expandGroups,
	type GridGroup,
	type GridLeaf,
	toGridGroups,
	toGridLeaf,
	toggleGroupExpanded,
} from './engine/grid-group/tree'
import { isManualPagination } from './engine/grid-pagination-utilities'
import {
	EMPTY_FROZEN_LAYOUT,
	type FrozenLayout,
	frozenLayout,
	sameFrozenLayout,
} from './engine/grid-pin/layout'
import {
	computeSortOrder,
	materializeSort,
	type SmartSortField,
} from './engine/grid-sort/utilities'
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
} from './engine/grid-table/options'
import {
	DEFAULT_PAGINATION_STATE,
	DEFAULT_SEARCH_PLACEHOLDER,
	deriveLeafRows,
	EMPTY_COLUMN_FILTERS,
	EMPTY_COLUMN_ORDER,
	EMPTY_GROUPING,
	EMPTY_SIZING,
	EMPTY_VISIBILITY,
	IDLE_SIZING_INFO,
	resolveActiveEngineTransform,
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

declare module '@tanstack/react-table' {
	// Carries the source GridColumn on each ColumnDef, so the engine's visible
	// columns map back to the grid's own columns (see `toGridColumns`).
	interface ColumnMeta<TData extends RowData, TValue> {
		gridColumn: GridColumn<TData>
	}
}

/** Parameters for {@link useGridTable}. @internal */
type GridTableParams<T> = {
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
	 * - The engine's client sort and filter transforms are forced manual, because
	 *   a client reorder would tear children from their headers.
	 * - The core row model is materialized for the body's cells.
	 * - The row-model views split into the full display list
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
	 * Whether a grand total aggregates the filtered rows. Only then does the
	 * engine build its filtered model for {@link GridTableResult.grandTotalRows}.
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
	/** Rows to render: the engine leaves when it materializes, else the sorted view, else the supplied `rows`. */
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
	 * Each visible column's settled width, for the body cells' truncation
	 * detector. It is `undefined` for a column the grid does not size. It is also
	 * `undefined` for every column while a drag is in flight, so the memoized
	 * cells hold frame to frame. The settled width then re-renders only that
	 * column's cells, which measure their overflow again. A keyboard `nudge` moves the width with no
	 * drag, and counts the same. It holds its reference while element-wise
	 * unchanged.
	 */
	settleWidths: (number | undefined)[]
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
 * @remarks It writes a ref during render, which the React Compiler does not
 * allow. The hold is safe here: it keeps a value equal to the new one, so a
 * render that React discards leaves nothing wrong behind.
 *
 * @internal
 */
function useStableValue<T>(candidate: T, same: (previous: T, next: T) => boolean): T {
	const ref = useRef(candidate)

	const stable = same(ref.current, candidate) ? ref.current : candidate

	ref.current = stable

	return stable
}

/**
 * The engine's `ColumnDef[]` for the grid's columns. `meta` carries the source
 * column, so the engine's visible columns map back to it.
 *
 * @internal
 */
function toColumnDefs<T>(
	columns: GridColumn<T>[],
	smartSortingFn: SortingFn<unknown>,
): ColumnDef<T>[] {
	return columns.map((col) => ({ ...toColumnDef(col, smartSortingFn), meta: { gridColumn: col } }))
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
 * A drag move fills the new widths inside the engine's `columnSizingInfo`
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
function useEagerSizingInfo(): [ColumnSizingInfoState, OnChangeFn<ColumnSizingInfoState>] {
	const [info, setInfo] = useState(IDLE_SIZING_INFO)

	const infoRef = useRef(info)

	const onChange = useCallback<OnChangeFn<ColumnSizingInfoState>>((updater) => {
		const next = functionalUpdate(updater, infoRef.current)

		infoRef.current = next

		setInfo(next)
	}, [])

	return [info, onChange]
}

/**
 * The engine's display rows when a transform materializes them, else `null`.
 * It reads the engine live, so only {@link useGridTable} calls it.
 *
 * @internal
 */
function engineDisplayRows<T>(table: Table<T>, materialize: boolean): Row<T>[] | null {
	return materialize ? table.getRowModel().rows : null
}

/**
 * The rows an export takes, read from the engine when the export runs: the
 * selected leaves in display order, else every leaf.
 *
 * @remarks
 * The collapse to leaves is load-bearing under grouping. Client grouping runs
 * before sorting in the engine's pipeline, so the sorted row model is the
 * group-header rows. A group header's `original` is its first leaf's datum. To
 * export that model directly yields one row per group. Group-header ids are
 * also absent from the mirrored selection state, so an active selection reads
 * as empty and silently falls back to the full set. Collapsing to leaves first
 * answers both.
 *
 * @internal
 */
function exportLeaves<T>(
	table: Table<T>,
	grouped: boolean,
	manualGroupRow: ((row: T) => boolean) | null,
): T[] {
	// `deriveLeafRows` owns both grouping modes. The sorted rows are never null, so
	// the coalesce only satisfies its nullable return.
	const leaves = deriveLeafRows(table.getSortedRowModel().rows, grouped, manualGroupRow) ?? []

	const selected = leaves.filter((row) => row.getIsSelected())

	return (selected.length > 0 ? selected : leaves).map((row) => row.original)
}

/**
 * Derives the flat row views the body reads: the manual display list, and the
 * flat `renderRows`/`rowKeys` backing selection identity and the data count.
 * `getRowModel().rows` is reference-stable until the sort, filter, pagination,
 * or grouping state changes. Memoizing on it therefore keeps these stable
 * across unrelated re-renders (resize-drag frames, selection toggles, search
 * keystrokes), along with the `rowIndexMap` GridData derives from them.
 *
 * Each key is taken from the engine's original-data row index (`leaf.index`,
 * the index `getRowId` saw), not the rendered position. A client transform
 * reorders rows while their engine ids stay fixed to the original order. A
 * rendered-index key would therefore diverge from `getRowId`.
 *
 * @internal
 */
function useGridRowModel<T>(args: {
	/** The engine's display rows when a transform materializes them, else `null`. */
	displayRows: Row<T>[] | null
	rows: T[]
	getKey: (row: T, index: number) => string | number
	grouped: boolean
	/** Manual-grouping group-header predicate; splits the display rows into headers and leaves. */
	manualGroupRow: ((row: T) => boolean) | null
	/** The off-engine sorted view (rows + keys) when a sort is the grid's sole transform, else `null`. */
	sortView: { rows: T[]; keys: (string | number)[] } | null
}): {
	manualRows: GridLeaf<T>[] | null
	renderRows: T[]
	rowKeys: (string | number)[]
} {
	const { displayRows, rows, getKey, grouped, manualGroupRow, sortView } = args

	// Under client grouping the display rows are the group rows, which expand to
	// their leaves. Under manual grouping they are the consumer's grouped
	// sequence, and the leaf set drops the group-header rows. Selection identity
	// and the data counts therefore track the actual data rows.
	const leafRows = useMemo<Row<T>[] | null>(
		() => deriveLeafRows(displayRows, grouped, manualGroupRow),
		[displayRows, grouped, manualGroupRow],
	)

	const manualRows = useMemo(
		() =>
			manualGroupRow && displayRows ? displayRows.map((row) => toGridLeaf(row, getKey)) : null,
		[manualGroupRow, displayRows, getKey],
	)

	// Engine leaves when materialized; else the off-engine sorted view; else the
	// rows straight through. Each key is taken at the row's original data index,
	// so a sorted-position key never diverges from `getRowId`.
	const renderRows = useMemo(
		() => (leafRows ? leafRows.map((leaf) => leaf.original) : (sortView?.rows ?? rows)),
		[leafRows, sortView, rows],
	)

	const rowKeys = useMemo<(string | number)[]>(() => {
		if (leafRows) return leafRows.map((leaf) => getKey(leaf.original, leaf.index))

		return sortView?.keys ?? rows.map((row, index) => getKey(row, index))
	}, [leafRows, sortView, rows, getKey])

	return { manualRows, renderRows, rowKeys }
}

/**
 * The groups of a client-grouped grid as values, and the action that opens or
 * closes one.
 *
 * @remarks
 * The engine collects the groups, and the grid opens them. The engine gets no
 * expansion state, so its display rows under grouping are the group rows alone,
 * each with all of its leaves on `subRows`. The groups build once for each new
 * set of group rows. A toggle then only swaps the value of the group it toggles
 * (see {@link expandGroups}).
 *
 * @internal
 */
function useGroupTree<T>(args: {
	/** The engine's display rows under grouping: its group rows. */
	displayRows: Row<T>[] | null
	/** The grouped column, or `null` when ungrouped. */
	grouping: string | number | null
	/** The expansion state; absent opens every group. */
	expanded: ExpandedState | undefined
	onExpandedChange: Dispatch<SetStateAction<ExpandedState>> | undefined
	getKey: (row: T, index: number) => string | number
}): { groups: GridGroup<T>[] | null; toggleGroup: (id: string) => void } {
	const { displayRows, grouping, onExpandedChange, getKey } = args

	const columnId = grouping == null ? null : String(grouping)

	const expanded = args.expanded ?? true

	const closed = useMemo(
		() => (columnId != null && displayRows ? toGridGroups(displayRows, columnId, getKey) : null),
		[columnId, displayRows, getKey],
	)

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

	return { groups, toggleGroup }
}

/**
 * The off-engine client sort. When a sort is the grid's *only* transform, it
 * orders `rows` directly through {@link computeSortOrder} and
 * {@link materializeSort}, which match the engine's `getSortedRowModel` exactly. A plain sorted grid therefore never
 * materializes the engine's Row-per-datum model. That is the same win the
 * lite-cell body buys mount and update, extended to sort. `null` when inactive
 * (no sort, or a filter / pagination / grouping is also live and the engine
 * sorts inside its pipeline).
 *
 * The sort columns are resolved to {@link SmartSortField}s in their own memo,
 * keyed on the sort and columns. A data change therefore re-sorts without
 * rebuilding the field list. The sort itself re-runs on that or a `rows` change.
 *
 * @internal
 */
function useSortView<T>(args: {
	rows: T[]
	getKey: (row: T, index: number) => string | number
	sort: GridSortState[] | undefined
	/** Whether the grid sorts client-side (a manual/server sort orders `rows` itself). */
	clientSort: boolean
	/** Whether the engine model is already materialized for another transform, which then sorts inside its pipeline. */
	materialize: boolean
	/** The full column set, to resolve each sort column's value accessor and any manual `sortFn`. */
	columns: GridColumn<T>[]
}): { rows: T[]; keys: (string | number)[] } | null {
	const { rows, getKey, sort, clientSort, materialize, columns } = args

	// The sort columns as fields, or `null` unless a sort is the sole transform (a
	// client sort with entries and no engine transform already reshaping the rows).
	const fields = useMemo<SmartSortField<T>[] | null>(() => {
		if (!clientSort || materialize || !sort?.length) return null

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
	}, [clientSort, materialize, sort, columns])

	// The decode-and-sort produces a permutation that depends only on the rows and
	// the sort spec (each column's id + direction), never on `getKey` — so a re-sort
	// of unchanged rows by a spec already seen (an asc/desc flip, the module's
	// costliest gesture; or an unrelated re-render) reuses the cached permutation
	// and pays only the linear materialize. The cache is scoped to the current rows
	// and columns — either identity changing drops it — so a stale order can never
	// outlive the data or the accessors it was computed against.
	const orderCacheRef = useRef<{
		rows: T[]
		columns: GridColumn<T>[]
		orders: Map<string, number[]>
	} | null>(null)

	return useMemo(() => {
		if (!fields || !sort?.length) return null

		let cache = orderCacheRef.current

		if (!cache || cache.rows !== rows || cache.columns !== columns) {
			cache = { rows, columns, orders: new Map() }

			orderCacheRef.current = cache
		}

		const sig = sort.map((entry) => `${String(entry.column)}:${entry.direction}`).join('|')

		let order = cache.orders.get(sig)

		if (!order) {
			order = computeSortOrder(rows, fields)

			cache.orders.set(sig, order)
		}

		return materializeSort(rows, order, getKey)
	}, [fields, rows, getKey, sort, columns])
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
 * centre, then frozen right. It memoizes each section on that state, so each
 * array keeps its identity until the state changes. The widths come from the
 * sizing state that the grid owns (see {@link columnWidths}).
 *
 * @internal
 */
function useColumnLayout<T>(table: Table<T>, resizable: boolean, sizingState: ColumnSizingState) {
	// The engine reads no sizing state for a grid that does not resize.
	const sizing = resizable ? sizingState : EMPTY_SIZING

	const left = table.getLeftVisibleLeafColumns()

	const center = table.getCenterVisibleLeafColumns()

	const right = table.getRightVisibleLeafColumns()

	const leaves = useMemo(() => [...left, ...center, ...right], [left, center, right])

	// Mapped back to their source `GridColumn`. The header, the body `<colgroup>`,
	// and the menus all read this.
	const visibleColumns = useMemo(() => toGridColumns(leaves), [leaves])

	const widths = useMemo(() => columnWidths(leaves, sizing), [leaves, sizing])

	return { left, right, leaves, visibleColumns, widths }
}

/** The column mid drag-resize in the drag state, or `null`. @internal */
function resizingColumn(resizable: boolean, info: ColumnSizingInfoState): string | null {
	return resizable && info.isResizingColumn ? info.isResizingColumn : null
}

/**
 * The {@link GridColumnResize} value and the settled widths the body cells
 * measure against (see {@link GridTableResult.settleWidths}).
 *
 * @internal
 */
function useResizeView<T>(args: {
	resizable: boolean
	table: Table<T>
	leaves: readonly Column<T, unknown>[]
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
}): { resize: GridColumnResize | null; settleWidths: (number | undefined)[] } {
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

	const settleWidths = useStableValue(
		visibleColumns.map((col) =>
			resize && !resizing && isDataColumn(col) ? resize.getSize(col.id) : undefined,
		),
		sameElements,
	)

	return { resize, settleWidths }
}

/**
 * The {@link GridColumnFilter} value, or `null` when no column is filterable.
 *
 * @internal
 */
function useFilterView<T>(args: {
	table: Table<T>
	enabled: boolean
	columns: GridColumn<T>[]
	applied: GridColumnFilterState[]
	affordance: GridColumnFilter['affordance'] | undefined
}): GridColumnFilter | null {
	const { table, enabled, columns, applied } = args

	const affordance = args.affordance ?? 'header'

	// Which column's filter sheet the right-click menu asked to open (the `'menu'`
	// affordance), or `null`. Lives here because a table instance holds no such state.
	const [openColumn, setOpenColumn] = useState<string | number | null>(null)

	const actions = useMemo(() => columnFilterActions(table), [table])

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
 * The layout holds its reference while every frozen column lands where it did.
 * A drag on a scrolling column then moves no frozen offset and re-renders no
 * row. A drag that shifts the frozen stack re-renders it frame by frame.
 *
 * @internal
 */
function usePinningView<T>(args: {
	hasPinned: boolean
	resizable: boolean
	columnPinning: ColumnPinningState
	visibleColumns: GridColumn<T>[]
	containerRef: RefObject<HTMLElement | null> | undefined
	left: readonly Column<T, unknown>[]
	right: readonly Column<T, unknown>[]
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

	return useMemo(() => (hasPinned ? buildColumnPinning(layout) : null), [hasPinned, layout])
}

/**
 * The full filtered row set, for a grand total. The engine memoizes its filtered
 * model on the rows and the filters, so the model keeps its identity until one
 * of them changes. It is built only for a grand total, since an inactive one
 * must not force the whole filtered set. Manual grouping carries the consumer's
 * group headers as rows, so it has no grand total (see `resolveGrandTotal`).
 *
 * @internal
 */
function useGrandTotalRows<T>(table: Table<T>, grandTotal: boolean, manualGrouped: boolean): T[] {
	const model = grandTotal && !manualGrouped ? table.getFilteredRowModel() : null

	return useMemo<T[]>(() => model?.rows.map((row) => row.original) ?? NO_ROWS, [model])
}

/**
 * Builds the {@link https://tanstack.com/table | TanStack Table} instance that
 * powers a {@link Grid}. It adapts the grid's `GridColumn[]` to TanStack
 * `ColumnDef[]` (mapping `value` to an accessor) and `getKey` to `getRowId`. It
 * then routes data through the table's row model, so pagination, filtering, and
 * column sizing ride one engine.
 *
 * @remarks Each feature is opt-in. Pagination and filtering each run server-side
 * (`manual`, the consumer transforms `rows`) or client-side (the engine slices
 * and filters); resizing rides the column-sizing API. The row model is only
 * materialized when a client-side transform is active, so a plain grid renders
 * straight from `rows`. `autoResetPageIndex` is off: the page is consumer-controlled.
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

	// A live map of column id -> descending, read by the smart comparator at
	// compare time so empties sink under both directions. Held in a ref refreshed
	// each render so a sort-direction flip doesn't rebuild the column defs.
	const sortDescByIdRef = useRef<Record<string, boolean>>({})

	sortDescByIdRef.current = useMemo(
		() => Object.fromEntries((sort ?? []).map((e) => [String(e.column), e.direction === 'desc'])),
		[sort],
	)

	const smartSortingFn = useMemo(
		() => makeSmartSortingFn((columnId) => sortDescByIdRef.current[columnId] ?? false),
		[],
	)

	const columnDefs = useMemo(() => toColumnDefs(columns, smartSortingFn), [columns, smartSortingFn])

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
	// the saved widths without a new callback on each render.
	const clearSizing = useEffectEvent(() => columnSizingConfig?.onValueChange?.({}))

	const clearSizingPreference = useCallback(() => clearSizing(), [])

	// The consumer-seeded widths (a restored/persisted sizing), captured once so the
	// autosizer can hold them on reload rather than measuring over them.
	const initialSizingRef = useRef(columnSizingConfig?.value ?? columnSizingConfig?.defaultValue)

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
			sizingInfo: columnSizingInfo,
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
			columnOrder: engineColumnOrder,
			columnVisibility,
		}),
		...(selectable ? { enableRowSelection: true } : {}),
		...paginationOptions<T>({ paginated, manual, config: paginationConfig, onPaginationChange }),
		...resizeOptions<T>({ resizable, onColumnSizingChange, onColumnSizingInfoChange }),
		...sortOptions<T>({ clientSort, onSortingChange }),
		...groupingOptions<T>({ grouped, onGroupingChange }),
		...filterOptions<T>({
			configured: filterMode.configured,
			manual: filterMode.manual,
			globalHighlight: globalHighlights,
			onGlobalFilterChange: globalConfigured ? onGlobalFilterChange : undefined,
			onColumnFiltersChange: hasColumnFilters ? onColumnFiltersChange : undefined,
		}),
	})

	const { left, right, leaves, visibleColumns, widths } = useColumnLayout(
		table,
		resizable,
		resolvedSizing,
	)

	const resizing = resizingColumn(resizable, columnSizingInfo)

	// Materialize the engine row model only when a transform that *needs* it is
	// active — a client filter, client pagination, or grouping. Capability is not
	// activity: a configured search with no query and a filter surface with no
	// entries reshape nothing, and materializing anyway would build the engine's
	// Row-per-datum model on every plain mount, the linear term the windowed body
	// exists to avoid. Sort is deliberately absent: a sort that is the grid's only
	// transform runs off the engine through `useSortView` below, so it never
	// forces the model. The row-model derivation (display rows, grouped display
	// list, flat leaf rows, and the `renderRows`/`rowKeys` the body reads) lives
	// in `useGridRowModel`.
	const engineTransform = resolveActiveEngineTransform({
		paginated,
		paginationManual: manual,
		filterMode,
		globalFilter: resolvedGlobalFilter,
		globalHighlights,
		columnFilters: resolvedColumnFilters,
		grouped,
	})

	const materialize = paginated || engineTransform || manualGroupRow != null

	// The off-engine client sort, active only when a sort is the grid's *sole*
	// transform (otherwise the engine sorts inside its pipeline, above).
	const sortView = useSortView({ rows, getKey, sort, clientSort, materialize, columns })

	// Manual grouping materializes the (untransformed) core model too: the
	// manual body segments it by position.
	const displayRows = engineDisplayRows(table, materialize)

	const { manualRows, renderRows, rowKeys } = useGridRowModel({
		displayRows,
		rows,
		getKey,
		grouped,
		manualGroupRow,
		sortView,
	})

	const { groups, toggleGroup } = useGroupTree({
		displayRows,
		grouping,
		expanded,
		onExpandedChange,
		getKey,
	})

	// Read from the engine on each render, so the totals follow client-side
	// filtering. A new value each render is correct, and the footer is cheap.
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
		table,
		// Fit distributes width across the *visible* data columns, not the hidden ones.
		columns: visibleColumns,
		containerRef,
		// Fingerprint from the keys the grid already derived, so the autosizer
		// never touches the engine row model just to notice a row change.
		rowsSignature: rowsSignatureOf(rowKeys),
		density,
		fitContent,
		resizing,
		columnFloors,
		// Infinite scroll's stable widths hold the fit against each appended batch.
		freezeOnRowChange: stableColumnWidths,
		// Restored/persisted widths start held, and the autosizer flags its own
		// writes so they stay off the consumer's `onValueChange`.
		initialSizing: initialSizingRef.current,
		autoSizingRef,
		clearPreference: clearSizingPreference,
	})

	const { resize, settleWidths } = useResizeView({
		resizable,
		table,
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
						setValue: (value: string) => table.setGlobalFilter(value),
						placeholder: globalFilterConfig?.placeholder ?? DEFAULT_SEARCH_PLACEHOLDER,
					}
				: null,
		[globalConfigured, resolvedGlobalFilter, globalFilterConfig, table],
	)

	const filters = useFilterView({
		table,
		enabled: hasColumnFilters,
		columns,
		applied: resolvedColumnFilters,
		affordance: columnFiltersConfig?.affordance,
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

	const grandTotalRows = useGrandTotalRows(table, grandTotal, manualGroupRow != null)

	const rowsForExport = useCallback(
		() => exportLeaves(table, grouped, manualGroupRow),
		[table, grouped, manualGroupRow],
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
		settleWidths,
		fitRenderedRows,
		widthsSettled,
		globalFilter,
		filters,
		pinning,
		grandTotalRows,
		rowsForExport,
	}
}
