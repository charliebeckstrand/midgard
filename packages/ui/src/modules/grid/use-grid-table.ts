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
	type ColumnSizingState,
	type ColumnVisibilityState,
	type columnResizingState,
	type ExpandedState,
	functionalUpdate,
	type OnChangeFn,
	type PaginationState,
	useTable,
} from '@tanstack/react-table'
import {
	type Dispatch,
	type RefObject,
	type SetStateAction,
	useCallback,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import type { DensityStep } from '../../core/density'
import { useControllable } from '../../hooks'
import { useStableEvent } from '../../hooks/use-stable-event'
import { useStableValue } from '../../hooks/use-stable-value'
import { isDataColumn, sameElements } from '../../utilities'
import type { GridSortState } from './context'
import { compileColumnFilters } from './engine/grid-filter/filter'
import type { GridGroup, GridLeaf } from './engine/grid-group/tree'
import { isManualPagination } from './engine/grid-pagination-utilities'
import { createSettleStore, type GridSettleStore } from './engine/grid-sizing/settle'
import { grandTotalRowsOf, hiddenSelectionCount, viewLeaves } from './engine/grid-table/client-view'
import {
	type EngineColumn,
	type EngineData,
	type EngineOptions,
	type EngineTable,
	type GridFeatures,
	gridFeatures,
} from './engine/grid-table/features'
import {
	buildColumnFilters,
	columnFilterActions,
	type GridColumnFilter,
	type GridGlobalFilterView,
} from './engine/grid-table/filter-view'
import {
	buildState,
	clampSizingToFloors,
	filterOptions,
	paginationOptions,
	resizeOptions,
	toColumnDefs,
	toGridColumns,
} from './engine/grid-table/options'
import { buildPaginationView, type GridPaginationView } from './engine/grid-table/pagination-view'
import { type GridColumnPinning, toColumnPinningState } from './engine/grid-table/pinning-view'
import {
	buildColumnResize,
	columnResizeActions,
	columnWidths,
	type GridColumnResize,
	type GridColumnResizeActions,
	resizingColumn,
} from './engine/grid-table/resize-view'
import {
	DEFAULT_PAGINATION_STATE,
	DEFAULT_SEARCH_PLACEHOLDER,
	EMPTY_COLUMN_FILTERS,
	EMPTY_COLUMN_ORDER,
	EMPTY_SIZING,
	EMPTY_VISIBILITY,
	IDLE_SIZING_INFO,
	resolveClientView,
	resolveTransformModes,
	rowsSignatureOf,
} from './engine/grid-table/state'
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
import {
	useFacetSource,
	useFilterModeMismatchWarning,
	useGridClientView,
	useGridRowModel,
	useGroupTree,
} from './use-grid-client-view'
import { useColumnResizeLifecycle, useGridColumnSizing } from './use-grid-column-sizing'
import { useGridPinningView } from './use-grid-pinning-view'

export type {
	GridColumnFacets,
	GridColumnFilter,
	GridGlobalFilterView,
} from './engine/grid-table/filter-view'
export type { GridPaginationView } from './engine/grid-table/pagination-view'
export type { GridColumnPinning } from './engine/grid-table/pinning-view'
export type { GridColumnResize } from './engine/grid-table/resize-view'

/** Parameters for {@link useGridTable}. @internal */
type GridTableParams<T> = {
	rows: readonly T[]
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
	density?: DensityStep
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
	renderRows: readonly T[]
	/**
	 * Per-row keys parallel to {@link renderRows}. Each is the value `getKey`
	 * yields at the row's engine (original-data) index, the index `getRowId` saw.
	 * Its stringified form therefore matches the id that `getRowId` gives,
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
	grandTotalRows: readonly T[]
	/**
	 * Reads the rows an export takes, in display order: the full filtered and
	 * sorted set (all pages). When the selection holds a row of that set, only
	 * the selected rows export. Both are the leaves only, so a group header never
	 * exports (see `viewLeaves`).
	 */
	rowsForExport: () => T[]
	/** How many selected rows the filtered set does not hold (see `hiddenSelectionCount`). */
	hiddenSelected: number
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
 * Builds the {@link https://tanstack.com/table | TanStack Table} instance that
 * powers a {@link Grid}, and the row views of the grid. It adapts the grid's
 * `GridColumn[]` to TanStack `ColumnDef[]` (mapping `value` to an accessor) and
 * `getKey` to `getRowId`.
 *
 * @remarks The engine holds the column state (order, visibility, sizing,
 * pinning) and the state of the row transforms, and the actions that write
 * them. It builds no row model. The grid filters, sorts, groups, and pages its
 * rows itself (see {@link useGridClientView} and `groupRows`). Each transform is
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

	// A new search or filter gives a new set of rows, so an uncontrolled page
	// starts again at the first page. The reset runs in the event that changes
	// the filter, so it costs no render of its own. A controlled page stays with
	// the consumer.
	const pageControlled = paginationConfig?.value !== undefined

	const resetPage = useCallback(() => {
		if (!paginated || pageControlled) return

		setPaginationState((prev) => (prev && prev.pageIndex !== 0 ? { ...prev, pageIndex: 0 } : prev))
	}, [paginated, pageControlled, setPaginationState])

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
	// the saved widths with one callback for the mount.
	const clearSizingPreference = useStableEvent(() => columnSizingConfig?.onValueChange?.({}))

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
		(updater) => {
			setGlobalFilterState((prev) => functionalUpdate(updater, prev ?? ''))

			resetPage()
		},
		[setGlobalFilterState, resetPage],
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
		(updater) => {
			setColumnFiltersState(
				(prev) =>
					functionalUpdate(updater, prev ?? EMPTY_COLUMN_FILTERS) as GridColumnFilterState[],
			)

			resetPage()
		},
		[setColumnFiltersState, resetPage],
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

	// The grid filters the global search and the column filters in one client
	// pass, so the filter mode is table-wide. It cannot be client for one surface
	// and server for the other. Warn (dev) when both are configured but their
	// `manual` flags disagree.
	useFilterModeMismatchWarning({
		globalConfigured,
		hasColumnFilters,
		globalManual: globalFilterConfig?.manual,
		columnManual: columnFiltersConfig?.manual,
	})

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

	// The column filters that reach the engine. A grid with no filterable column
	// gives the engine no filter state, so its filters apply to no row. This block
	// comes before the engine options. The React Compiler reads a plain call after
	// a memo as a possible change to the inputs of the memo, so it would skip this
	// hook if the block came later (see `react-compiler-skips.test.ts`).
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
				pinned: hasPinned,
				columnPinning,
				columnOrder: engineColumnOrder,
				columnVisibility,
			}),
			...paginationOptions<T>({ paginated, manual, config: paginationConfig, onPaginationChange }),
			...resizeOptions<T>({ resizable, onColumnSizingChange, onColumnSizingInfoChange }),
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
			hasPinned,
			columnPinning,
			engineColumnOrder,
			columnVisibility,
			manual,
			paginationConfig,
			onPaginationChange,
			onColumnSizingChange,
			onColumnSizingInfoChange,
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
	const clientView = useGridClientView({
		rows,
		sort,
		clientSort,
		filtered: clientTransforms.filtered,
		page: clientTransforms.page,
		query: searchQuery,
		columnTests,
		columns,
		grandTotal,
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
				// A client view holds a page past the end to the last page.
				pagination:
					clientView?.pageIndex === undefined
						? resolvedPagination
						: { ...resolvedPagination, pageIndex: clientView.pageIndex },
				manual,
				config: paginationConfig,
				rows: clientView?.total ?? rows.length,
				pageRowCount: renderRows.length,
			})
		: null

	// The fingerprint reads every key, so it runs once for each new set of keys and not
	// on each render.
	const rowsSignature = useMemo(() => rowsSignatureOf(rowKeys), [rowKeys])

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
		rowsSignature,
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

	const pinning = useGridPinningView({
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

	const hiddenSelected = useMemo(
		() =>
			selection
				? hiddenSelectionCount({ rows, kept: clientView?.kept ?? null, getKey, selection })
				: 0,
		[selection, rows, clientView, getKey],
	)

	const rowsForExport = useCallback(
		() => viewLeaves({ rows, getKey, groups: closed, manualGroupRow, clientView, selection }),
		[manualGroupRow, selection, rows, getKey, closed, clientView],
	)

	return {
		visibleColumns,
		renderRows,
		rowKeys,
		grouped: grouping != null,
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
		hiddenSelected,
	}
}
