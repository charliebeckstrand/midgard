'use client'

import { useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Table } from '../../components/table'
import { announce, cn, dataAttr } from '../../core'
import { useA11yAnnouncements, useControllable } from '../../hooks'
import { useIsomorphicLayoutEffect } from '../../hooks/use-isomorphic-layout-effect'
import { useDensityLevel } from '../../providers/density'
import { isDataColumn } from '../../utilities'
import { GridContext, GridHighlightContext, GridResizingContext, type SortState } from './context'
import {
	describeColumnVisibility,
	describePin,
	describeSelection,
	describeSort,
} from './engine/grid-announcements'
import { columnLabel } from './engine/grid-column/label'
import { DEFAULT_EXPORTABLE } from './engine/grid-export/registry'
import {
	isGroupableColumnId,
	manualGroupPredicate,
	manualGroupSortDirection,
	resolveDetailExpansion,
	resolveGroupByContext,
	resolveGroupHeaderRow,
	resolveGroupingGates,
	resolveGroupingMode,
	resolveManualGroupBody,
} from './engine/grid-group/resolve'
import { applyPinOverrides, type PinSide, toPinOverrides } from './engine/grid-pin/overrides'
import { resolveGridReorder } from './engine/grid-reorder-compute'
import {
	bridgeCellActivate,
	bridgeRowActivate,
	buildRovingCellActivate,
	composeCellDoubleClick,
} from './engine/grid-row/bridges'
import {
	condensedTableClass,
	gridWrapperClass,
	outlineTableClass,
	resolveDensity,
	settleBodyClass,
	stripedForOutline,
} from './engine/grid-table/classes'
import { assertGridProps, implyVirtualize } from './engine/grid-table/guards'
import {
	seedColumnManager,
	seedColumnOrder,
	seedColumnSizing,
	seedPinning,
} from './engine/grid-table/seeds'
import { GridAutoSizeConfirmDialog } from './grid-auto-size-confirm-dialog'
import { GridBody } from './grid-body'
import { GridBusyStatus } from './grid-busy-status'
import { GridColumnManagerDialog } from './grid-column-manager-dialog'
import { useColumnGroupMenu } from './grid-context-menu'
import {
	resolveAriaRowCount,
	resolveFooterStats,
	resolveGridSemantics,
	resolveHover,
	resolveInfiniteScroll,
	resolveResizeLayout,
	resolveSortable,
	resolveTableProps,
	resolveVirtualization,
} from './grid-data-resolvers'
import type { GridDataProps, GridPinningState } from './grid-data-types'
import { GridFooter as GridFooterBar } from './grid-footer'
import { GridGroupByContext } from './grid-group-by-button'
import { GridHead } from './grid-head'
import { useGridMenuActions } from './grid-menu-actions'
import { GridPagination as GridPaginationFooter } from './grid-pagination'
import {
	DensityCascade,
	GridRegion,
	GridRowManagerRegionDialog,
	GridRowReorderRegion,
	GridScrollRegion,
} from './grid-region'
import { useGridSort } from './grid-sort-state'
import { useColumnSettleWidths } from './grid-table-views'
import { GridToolbar } from './grid-toolbar'
import { GridGrandTotalBody, useGridGrandTotal } from './grid-total-row'
import type { GridScrollRowIntoView } from './grid-virtualized-body'
import type { GridColumn, GridSearch } from './types'
import { useGridColumns } from './use-grid-columns'
import { useGridCursor } from './use-grid-cursor'
import { useGridExpansion } from './use-grid-expansion'
import { useGridExport } from './use-grid-export'
import { useGridGroup } from './use-grid-group'
import { GridNavContext } from './use-grid-navigation'
import { useGridReorder } from './use-grid-reorder'
import { useGridRoving } from './use-grid-roving'
import { useGridRowGrouping } from './use-grid-row-grouping'
import { useGridRowManagerRegion } from './use-grid-row-manager'
import { useGridRowReorder } from './use-grid-row-reorder'
import { useGridSelectionActions, useGridSelectionState } from './use-grid-selection'
import { type GridGlobalFilterView, useGridTable } from './use-grid-table'

/**
 * Whether the grid's current state permits a manual row drag-reorder. A manual
 * order only holds against the natural row order, so reordering stands down
 * whenever the rendered rows diverge from the source set — an active column
 * sort, a filtered/searched view (fewer rendered rows than source), pagination,
 * or virtualization — and on an empty/loading grid. The rendered-length check
 * catches client filtering, search, and client pagination in one; the pagination
 * and virtualization flags catch the server-page and windowed cases.
 *
 * @internal
 */
function rowReorderPermitted(args: {
	loading: boolean
	hasData: boolean
	paginated: boolean
	virtualized: boolean
	grouped: boolean
	sorted: boolean
	renderedCount: number
	sourceCount: number
}): boolean {
	return (
		!args.loading &&
		args.hasData &&
		!args.paginated &&
		!args.virtualized &&
		!args.grouped &&
		!args.sorted &&
		args.renderedCount === args.sourceCount
	)
}

/**
 * Dev-only guard against a `maxHeight` that can never bind: the grid's wrapper
 * is auto-height, so a *percentage* resolves to no constraint — the scroll
 * container silently unbinds, virtualization degrades to rendering every row,
 * and infinite scroll loses its window. Warns once per value; the `'fill'`
 * keyword is the supported way to take a CSS-sized parent's box. Kept a hook so
 * the branch stays off {@link GridData}'s complexity budget. @internal
 */
function useMaxHeightGuard(maxHeight: string | undefined): void {
	useEffect(() => {
		if (process.env.NODE_ENV === 'production') return

		if (!maxHeight?.trim().endsWith('%')) return

		console.warn(
			`<Grid maxHeight="${maxHeight}">: a percentage can't bind — the grid's wrapper is auto-height, so the scroll container gets no bounded height and virtualization degrades to rendering every row. Use a fixed CSS length, or \`maxHeight="fill"\` inside a CSS-sized parent.`,
		)
	}, [maxHeight])
}

/**
 * Tracks whether a server-side (manual) sort is in flight — the interval between
 * the grid emitting a sort change and the consumer handing back the reordered
 * `rows` — so the body can dim its rows to a settle wash until the new order
 * lands (see `k.body.settling`). Enabled only under {@link GridSort.manual}: a
 * change to the sort with no new `rows` yet marks the grid settling; the next
 * `rows` reference (the fetched, reordered set) clears it. A consumer that swaps
 * `rows` in the same commit as the sort — a synchronous re-sort — settles at
 * once, so its rows never flash dim.
 *
 * @internal
 */
function useServerSortSettle<T>(args: { enabled: boolean; sort: SortState[]; rows: T[] }): boolean {
	const { enabled, sort, rows } = args

	const [settling, setSettling] = useState(false)

	const prevSortRef = useRef(sort)

	const prevRowsRef = useRef(rows)

	useEffect(() => {
		const sortChanged = prevSortRef.current !== sort

		const rowsChanged = prevRowsRef.current !== rows

		prevSortRef.current = sort

		prevRowsRef.current = rows

		// New rows landed (or the mode is off): the sort has settled.
		if (!enabled || rowsChanged) {
			setSettling(false)

			return
		}

		// The sort changed but its reordered rows haven't arrived yet — in flight.
		if (sortChanged) setSettling(true)
	}, [enabled, sort, rows])

	return enabled && settling
}

/**
 * Stabilizes a consumer event callback (`onRowClick`, `onCellClick`, and their
 * double-click counterparts) so the memoized rows hold across renders: returns
 * a referentially-stable handler (or `undefined` when no callback is set) that
 * reads the live callback through a ref, so an inline consumer callback
 * doesn't churn every row.
 *
 * @internal
 */
function useStableHandler<A extends unknown[]>(
	handler: ((...args: A) => void) | undefined,
): ((...args: A) => void) | undefined {
	const ref = useRef(handler)

	ref.current = handler

	const present = handler != null

	return useMemo(() => (present ? (...args: A) => ref.current?.(...args) : undefined), [present])
}

/**
 * The active highlight-search query: the debounced quick-search value when the
 * search marks rather than prunes ({@link GridSearch.filter} `false`) and it holds
 * a query, else `null`. Data cells read it through {@link GridHighlightContext} to
 * mark their matches; `null` while the search filters, is empty, or is unset.
 * Kept out of {@link GridData} for its cognitive-complexity budget.
 *
 * @internal
 */
function resolveHighlightQuery(
	search: GridSearch | undefined,
	globalFilter: GridGlobalFilterView | null,
): string | null {
	if (search?.filter !== false) return null

	// `|| null` (not `??`) so an empty query collapses to null — no marking.
	return globalFilter?.value || null
}

/**
 * The read-only data-grid implementation behind {@link Grid}. Kept a separate
 * component so the public dispatcher calls no hooks ahead of its `editable`
 * branch (the rules of hooks forbid a conditional early return over them).
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function GridData<T>({
	columns,
	rows,
	getKey,
	sort: sortConfig,
	selection: selectionConfig,
	preferences,
	columnOrder: columnOrderConfigProp,
	pinning: pinningConfigProp,
	columnManager: columnManagerConfigProp,
	groups: groupsConfig,
	groupBy: groupByConfig,
	groupTotalRow,
	grandTotalRow,
	expandable: expandableConfig,
	pagination: paginationConfig,
	resizable = true,
	columnSizing: columnSizingConfigProp,
	search: searchConfig,
	columnFilters: columnFiltersConfig,
	contextMenu,
	exportable = DEFAULT_EXPORTABLE,
	exportRows,
	reorder = false,
	rowReorder: rowReorderConfig,
	navigable = false,
	editable,
	truncate = true,
	rowClassName,
	onRowClick,
	onCellClick,
	onRowDoubleClick,
	onCellDoubleClick,
	rowLabel,
	header,
	maxHeight,
	loading = false,
	rowLoading,
	empty,
	error,
	footer,
	virtualize,
	infiniteScroll: infiniteScrollConfig,
	tableProps,
	density: densityProp,
	condensed = false,
	bleed,
	outline,
	striped,
	hover,
	className,
}: GridDataProps<T>) {
	// Fold the `preferences` snapshot into each column binding as its default,
	// unless the consumer bound that dimension explicitly (an explicit
	// value/defaultValue wins). This is the single seed the four bindings share;
	// changes still flow out through each binding's own callbacks. An empty order
	// is treated as absent so it can't defeat the declaration-order fallback.
	const columnOrderConfig = seedColumnOrder(columnOrderConfigProp, preferences)

	const pinningConfig = seedPinning(pinningConfigProp, preferences)

	const columnSizingConfig = seedColumnSizing(columnSizingConfigProp, preferences)

	const columnManagerConfig = seedColumnManager(columnManagerConfigProp, preferences)

	// Up-front invariants for the mutually-dependent props (virtualize/maxHeight,
	// infiniteScroll/virtualize, infiniteScroll-vs-pagination); see `assertGridProps`.
	assertGridProps({
		virtualize,
		maxHeight,
		infiniteScroll: infiniteScrollConfig,
		pagination: paginationConfig,
	})

	// A percentage `maxHeight` never binds; fail loud in dev (see `useMaxHeightGuard`).
	useMaxHeightGuard(maxHeight)

	// Unlike the bare `Table` (a static/RSC leaf that reads no context), Grid is
	// always client-rendered, so it can inherit an enclosing `DensityProvider`
	// when the caller passes no explicit `density`.
	// `condensed` is a tight preset: it forces the compact step for every
	// density-derived metric (cell padding, resize-handle width, virtualized
	// row-height, autosize measurement), then layers the font/icon/cascade steps
	// below. Resolving it here means one effective `density` flows to the engine,
	// resolvers, and `<Table>` unchanged.
	const density = resolveDensity(condensed, useDensityLevel(densityProp))

	const {
		enabled: virtualizeEnabled,
		estimateSize,
		overscan,
	} = resolveVirtualization(implyVirtualize(virtualize, infiniteScrollConfig), density)

	// Sticky header pins the header row while the body scrolls (forcing a scroll
	// wrapper); resolved from the `header` config's `position`.
	const stickyHeader = header?.position === 'sticky'

	// Columns sort by default; bake that into each data column that doesn't set
	// its own `sortable`, so head and engine read one resolved flag.
	const resolvedColumns = useMemo(() => resolveSortable(columns), [columns])

	// Menu-applied pin changes, layered over the static `pinned` flags. Folding
	// them into the columns here lets the column and engine hooks read one
	// `pinned` flag whether it came from the definition or the menu. The state
	// is controllable through the `pinning` binding so consumers can persist it;
	// unbound, it stays internal exactly as before.
	const onPinningChange = pinningConfig?.onValueChange

	const [pinningState, setPinningState] = useControllable<GridPinningState>({
		value: pinningConfig?.value,
		defaultValue: pinningConfig?.defaultValue,
		// Coalesced to a concrete object, matching the other bindings' non-nullable callbacks.
		onValueChange: (next) => onPinningChange?.(next ?? {}),
	})

	const pinOverrides = useMemo(() => toPinOverrides(pinningState), [pinningState])

	const pinnedColumns = useMemo(
		() => applyPinOverrides(resolvedColumns, pinOverrides),
		[resolvedColumns, pinOverrides],
	)

	// Row grouping: resolve the `groupBy` binding to a groupable data column (a
	// stray id leaves the grid ungrouped), plus the expansion state — the engine's
	// under client grouping, the binding's key set under manual. Grouping renders
	// its own body, so it stands down the cursor, pagination, and virtualization
	// below.
	const isGroupableColumn = useCallback(
		(id: string | number) => isGroupableColumnId(pinnedColumns, id),
		[pinnedColumns],
	)

	const {
		grouping,
		setGrouping,
		manual: groupingManual,
		groupRow,
		expanded: groupExpanded,
		setExpanded: setGroupExpanded,
		manualExpanded,
		toggleGroup,
		renderHeader: groupRenderHeader,
	} = useGridRowGrouping<T>(groupByConfig, isGroupableColumn)

	// Client grouping computes groups on the engine; manual grouping renders the
	// consumer-supplied header/children sequence and needs the row contract.
	const groupingMode = resolveGroupingMode({ manual: groupingManual, grouping, groupRow })

	const { groupingActive, manualGroupingActive } = groupingMode

	// Master-detail: the expanded-key set, per-row toggle, and detail renderer,
	// resolved to whether it's active (grouping takes precedence, so it stands
	// down under grouping) and the body wiring the flat rows read.
	const detail = resolveDetailExpansion(useGridExpansion<T>(expandableConfig), groupingMode.active)

	// A self-rendering body (grouping or master-detail) stands the cursor and
	// virtualization down; client grouping also stands pagination down, manual
	// grouping keeps a manual one, master-detail keeps any (see
	// `resolveGroupingGates`).
	const gated = resolveGroupingGates({
		groupingActive,
		manualGroupingActive,
		expandableActive: detail.active,
		navigable,
		virtualize: virtualizeEnabled,
		pagination: paginationConfig,
	})

	// Infinite scroll layers on the virtualized window — so it stands down with
	// virtualization under grouping (`gated.virtualize`). Its `threshold` defaults
	// to the window's `overscan`, so the fetch leads the viewport by that margin;
	// the source `rows` length derives `hasMore` when a `totalRows` is supplied.
	const infiniteScroll = gated.virtualize
		? resolveInfiniteScroll(infiniteScrollConfig, overscan, rows.length)
		: null

	// Resolves a column's display label at call time, read by the `[]`-stable
	// `pinColumn` and the visibility handler so they can narrate the change without
	// closing over (and re-creating on) the columns.
	const columnLabelRef = useRef<(id: string | number) => string>(() => '')

	columnLabelRef.current = (id) => {
		const column = pinnedColumns.find((candidate) => candidate.id === id)

		return column ? columnLabel(column) : String(id)
	}

	const pinColumn = useCallback(
		(id: string | number, side: PinSide | false) => {
			setPinningState((prev) => ({ ...prev, [String(id)]: side === false ? 'none' : side }))

			// Narrate the pin change; the header gives no visible text cue (WCAG 4.1.3).
			announce(describePin(columnLabelRef.current(id), side))
		},
		[setPinningState],
	)

	// Keyboard cursor (and, under `editable`, per-row editing layered on it).
	// Bounds, the active row, the row keys, and the visible data columns resolve
	// from these refs at event/render time, so the cursor's callbacks and the
	// augmented columns stay stable across moves and the memoized rows hold.
	const rowsRef = useRef<T[]>([])

	const colCountRef = useRef(0)

	const rowIndexMapRef = useRef<Map<T, number>>(new Map())

	const colIndexMapRef = useRef<Map<string | number, number>>(new Map())

	const rowKeysRef = useRef<(string | number)[]>([])

	const dataColumnsRef = useRef<GridColumn<T>[]>([])

	// Selection wiring the cursor reads at key time: whether a selection column is
	// present (gating Space-to-select) and a toggle for the active row by display
	// index. Both resolve after the engine produces `rowKeys`, so the cursor reads
	// them through refs, like its bounds above.
	const selectableRef = useRef(false)

	const toggleRowRef = useRef<(key: string | number) => void>(() => {})

	const toggleActiveRow = useCallback((rowIdx: number) => {
		const key = rowKeysRef.current[rowIdx]

		if (key !== undefined) toggleRowRef.current(key)
	}, [])

	// Published by the virtualized body while mounted (null otherwise), so the cursor
	// can scroll an off-window row into the rendered window before pointing
	// `aria-activedescendant` at it.
	const scrollRowIntoViewRef = useRef<GridScrollRowIntoView | null>(null)

	// The grid's scroll container (sticky/virtualized), attached below; the cursor
	// measures it for the viewport-relative PageUp/Down step.
	const scrollRef = useRef<HTMLDivElement>(null)

	// The grid `<table>`, the roving container for row/cell keyboard navigation
	// (see `useGridRoving`), attached below through `resolveTableProps`.
	const tableRef = useRef<HTMLTableElement>(null)

	// Stable click handlers so the memoized rows don't churn when the consumer
	// passes inline callbacks; the cursor also activates its cell/row on Enter.
	const handleRowClick = useStableHandler(onRowClick)

	const handleCellClick = useStableHandler(onCellClick)

	const handleRowDoubleClick = useStableHandler(onRowDoubleClick)

	const handleCellDoubleClick = useStableHandler(onCellDoubleClick)

	// Bridge the row-click into the cursor's Enter/Space activation (see `bridgeRowActivate`).
	const onRowActivate = useMemo(() => bridgeRowActivate(handleRowClick), [handleRowClick])

	// Cell-roving activation: a focused cell's Enter/Space fires the cell click
	// then the row click, the same order (and pair) a pointer click fires. Stable
	// so the memoized cells hold; only invoked while cell roving is active.
	const cellActivate = useMemo(
		() => buildRovingCellActivate(handleCellClick, handleRowClick),
		[handleCellClick, handleRowClick],
	)

	// Bridge the cell-click the same way: the cursor hands over its display
	// indices, resolved to the cell context through the live refs at activation.
	const onCellActivate = useMemo(
		() => bridgeCellActivate(handleCellClick, { rowsRef, rowKeysRef, dataColumnsRef }),
		[handleCellClick],
	)

	// Column groups: the controllable binding, collapse state, the ids collapsed
	// groups hide from the engine, and the band-row resolver rendered below.
	const group = useGridGroup(groupsConfig)

	// The cursor + editing layer: the augmented columns, the `<table>` cursor
	// props, the cursor store, and the row-editing-context wrapper. Inert for a
	// static grid.
	const cursor = useGridCursor<T>({
		// The navigable cursor indexes flat data rows; grouping interleaves group
		// headers, so the cursor stands down while grouping is active (see `gated`).
		navigable: gated.navigable,
		editable,
		columns: pinnedColumns,
		onRowActivate,
		onCellActivate,
		selectableRef,
		toggleActiveRow,
		scrollRowIntoViewRef,
		scrollContainerRef: scrollRef,
		refs: {
			rowsRef,
			colCountRef,
			rowIndexMapRef,
			colIndexMapRef,
			rowKeysRef,
			dataColumnsRef,
		},
	})

	// Double-click-to-edit (under `editable.trigger: 'doubleClick'`) rides the
	// built-in cell double-click event, ahead of the consumer's handler.
	const cellDoubleClick = useMemo(
		() => composeCellDoubleClick(cursor.editOnCellDoubleClick, handleCellDoubleClick),
		[cursor.editOnCellDoubleClick, handleCellDoubleClick],
	)

	const { sort, setSort, toggleSort } = useGridSort(sortConfig)

	// Server-side (manual) sort pulses the rows at a reduced opacity from the moment
	// the grid emits the sort change until the consumer hands back the reordered
	// rows, so the current rows stay readable while they reorder (see `k.body`). Off
	// for client sorting, where the engine reorders in place with no round trip.
	const sortManual = sortConfig?.manual ?? false

	const serverSortSettling = useServerSortSettle({ enabled: sortManual, sort, rows })

	// Drives the opt-in row-sort FLIP down through `GridBody`; read here so the
	// gate below stands the animation down for a reduced-motion user (WCAG 2.3.3) —
	// a `MotionConfig` alone would not, since it leaves `layout` animations running.
	const reduceMotion = useReducedMotion()

	// Selection state lives above the engine so the table can mirror it into its
	// own `state.rowSelection`; the row-derived flags and toggles come after the
	// engine produces `rowKeys` (see `useGridSelectionActions` below).
	const { selection, setSelection } = useGridSelectionState(selectionConfig)

	const batchActions = selectionConfig?.batchActions

	const {
		columnOrder,
		setColumnOrder,
		hiddenColumns,
		setHiddenColumns,
		columnVisibility,
		reorderColumns,
		managerItems,
	} = useGridColumns<T>({
		columns: pinnedColumns,
		columnOrderConfig,
		columnManagerConfig,
		groups: group.groups,
		forcedHidden: group.collapsedHidden,
	})

	// Narrate column show/hide from the manager (WCAG 4.1.3): the incoming hidden
	// set is concrete (the visibility hook resolves the manager's updater first), so
	// diff it against the current one to name the column the toggle moved.
	const hiddenColumnsRef = useRef(hiddenColumns)

	hiddenColumnsRef.current = hiddenColumns

	const handleHiddenChange = useCallback(
		(next: Set<string | number>) => {
			const prev = hiddenColumnsRef.current

			for (const id of next) {
				if (!prev.has(id)) announce(describeColumnVisibility(columnLabelRef.current(id), true))
			}

			for (const id of prev) {
				if (!next.has(id)) announce(describeColumnVisibility(columnLabelRef.current(id), false))
			}

			setHiddenColumns(next)
		},
		[setHiddenColumns],
	)

	// TanStack Table is the data engine: rows flow through its row model, which
	// also surfaces the pagination state and handlers the footer renders from.
	// When `pagination` is unset the model is bypassed and `renderRows === rows`.
	// Measured to auto-size resizable columns to fill the available width.
	const wrapperRef = useRef<HTMLDivElement>(null)

	// Manual grouping marks the consumer's group-header rows for the engine's
	// row-model split; `null` otherwise (see `manualGroupPredicate`).
	const manualGroupRow = useMemo(
		() => manualGroupPredicate(manualGroupingActive, groupRow),
		[manualGroupingActive, groupRow],
	)

	const {
		table,
		visibleColumns,
		renderRows,
		rowKeys,
		groupedRows,
		manualRows,
		pagination,
		resize,
		globalFilter,
		filters,
		pinning,
	} = useGridTable<T>({
		rows,
		// The engine receives the full column set and resolves which render (and
		// in what order) from the order / visibility / pinning state below;
		// `visibleColumns` comes back in that resolved order for the header and body.
		// Under a cursor (navigable or editable) these carry the cursor/editor
		// wiring (see `useGridCursor`).
		columns: cursor.columns,
		getKey,
		selection,
		columnOrder,
		columnVisibility,
		sort,
		setSort,
		sortManual,
		// Client grouping only — manual grouping keeps the engine ungrouped and
		// renders the consumer's sequence instead.
		grouping: groupingMode.engineGrouping,
		expanded: groupExpanded,
		onExpandedChange: setGroupExpanded,
		manualGroupRow,
		// Grouping renders its own body and stands pagination down (`gated.pagination`
		// is `undefined` while grouping), so the engine doesn't page the groups.
		pagination: gated.pagination,
		resizable,
		// Infinite scroll can hold the auto-fit column widths steady so an appended
		// batch never reflows the columns (see `GridInfiniteScroll.stableColumnWidths`).
		// `resolveInfiniteScroll` already defaulted the flag; `useGridTable` treats an
		// absent binding (undefined) as off.
		stableColumnWidths: infiniteScroll?.stableColumnWidths,
		columnSizing: columnSizingConfig,
		globalFilter: searchConfig,
		columnFilters: columnFiltersConfig,
		containerRef: wrapperRef,
		density,
	})

	// Cursor index space: rendered rows and the visible *data* columns (it skips
	// select / actions cells). Synced from the refs here — after the engine resolves
	// order and visibility — so the cell ids, `aria-activedescendant`, and
	// click-to-focus track the displayed grid even as it sorts, filters, or paginates.
	const dataColumns = useMemo(() => visibleColumns.filter(isDataColumn), [visibleColumns])

	// Roving-tabindex keyboard navigation over the clickable rows (row mode) or
	// data cells (cell mode), for a grid that carries click handlers but not the
	// navigable cursor. Stands down under the cursor (which owns the keyboard) and
	// under virtualization (whose rows unmount on scroll). The virtualized body
	// keeps its legacy per-row static Tab stop instead (`rowStaticStop`).
	const roving = useGridRoving({
		navigable: cursor.cursorEnabled,
		virtualized: gated.virtualize,
		onRowClick: onRowClick != null,
		onRowDoubleClick: onRowDoubleClick != null,
		onCellClick: onCellClick != null,
		onCellDoubleClick: onCellDoubleClick != null,
		tableRef,
		dataColCount: dataColumns.length,
	})

	const rowIndexMap = useMemo(
		() => new Map(renderRows.map((row, i) => [row, i] as const)),
		[renderRows],
	)

	const colIndexMap = useMemo(
		() => new Map(dataColumns.map((col, i) => [col.id, i] as const)),
		[dataColumns],
	)

	rowsRef.current = renderRows

	colCountRef.current = dataColumns.length

	rowIndexMapRef.current = rowIndexMap

	colIndexMapRef.current = colIndexMap

	// Editing resolves a cell's row key and column from these — the cursor's row
	// and (data-)column index spaces.
	rowKeysRef.current = rowKeys

	dataColumnsRef.current = dataColumns

	// Re-clamp the cursor whenever the rendered bounds change (filter, paginate,
	// hide a column), so its active cell and `aria-activedescendant` never dangle
	// past the new extent; inert for a non-cursor grid (active stays unseated).
	useIsomorphicLayoutEffect(() => {
		cursor.reconcile(renderRows.length, dataColumns.length)
	}, [cursor.reconcile, renderRows.length, dataColumns.length])

	// Visible rows drive the select-all checkbox.
	const hasRows = renderRows.length > 0

	// Column interactions stand down when there's no *source* data to act on
	// (incl. while loading), or when an error has pre-empted the body — mirroring
	// the empty state, since both replace the rows there's nothing to act on. They
	// stay live when a filter or search merely empties the view, so the user can
	// clear it and recover the rows. `showingError` tracks the body's own error
	// branch (see `GridBody`), which loading takes precedence over.
	const showingError = !loading && error != null && error !== false

	const hasData = rows.length > 0 && !showingError

	// A selection column makes rows selectable, so each row exposes `aria-selected`
	// and a true grid advertises `aria-multiselectable` (see `resolveTableProps`).
	const hasSelectionColumn = useMemo(
		() => visibleColumns.some((col) => col.selectable),
		[visibleColumns],
	)

	const { toggleRow, toggleAll, allSelected, someSelected } = useGridSelectionActions({
		selection,
		setSelection,
		rowKeys,
	})

	// Feed the cursor's selection refs now that the engine has resolved them, so its
	// Space key toggles the active row's selection (see `useGridNavigation`).
	selectableRef.current = hasSelectionColumn

	toggleRowRef.current = toggleRow

	// Narrate sort and selection changes to assistive tech without moving focus
	// (WCAG 4.1.3). Both dedupe and skip their initial value; selection stays
	// silent unless the grid has a selection column.
	useA11yAnnouncements(describeSort(sort, visibleColumns))

	useA11yAnnouncements(describeSelection(selection.size, allSelected, pagination != null), {
		enabled: hasSelectionColumn,
	})

	// Resolve the `exportable` prop into one action per configured export type,
	// each reading the selected rows when a selection is active, else the full
	// filtered + sorted set (all pages) — the engine mirrors the grid's
	// selection `Set` into its own state, so the selected subset keeps the
	// displayed order. An `exportRows` source overrides both, supplying the rows
	// the engine can't hold under server pagination. Shared by the toolbar's
	// "Export" dropdown and both context menus.
	const exportActions = useGridExport<T>({ exportable, columns: visibleColumns, table, exportRows })

	// Fixed-layout column widths so a resize touches only its own column;
	// `resizing` flags an in-flight drag so head/cells suppress their hover wash
	// and truncation tooltips (shared below via context) and the active column's
	// grip reads accent.
	const { colGroup, tableClassName, tableWidth, resizing } = resolveResizeLayout({
		resizable,
		resize,
		columns: visibleColumns,
		density,
		className,
	})

	// While a server-side (manual) sort is in flight, the data body pulses at a
	// reduced opacity until the reordered rows land (projected from the `<table>`
	// onto its data `<tbody>`; see `settleBodyClass`). `serverSortSettling` is only
	// ever set under a manual sort, so a client-sorted grid's table class is
	// untouched — the engine reorders it in place with no round trip.
	const bodyStateClass = settleBodyClass(serverSortSettling)

	// Per-visible-column width snapshot threaded to the body cells' truncation
	// detector so a settled resize (or keyboard nudge) re-renders just that
	// column's cells to re-measure overflow; frozen during a drag so the memoized
	// cells hold frame-to-frame (see `useColumnSettleWidths`).
	const settleWidths = useColumnSettleWidths(visibleColumns, resize, resizing)

	// `resizing` stays on this table-wide value for external `useGrid()` consumers,
	// but the grid's own truncating head/cells read it through the narrower
	// `GridResizingContext` (below) — so a sort or select-all, which churns this
	// value, no longer re-renders every visible truncating cell.
	const context = useMemo(
		() => ({
			toggleRow,
			toggleAll,
			allSelected,
			someSelected,
			sort,
			toggleSort,
			pinColumn,
			stickyHeader,
			resizing,
		}),
		[
			toggleRow,
			toggleAll,
			allSelected,
			someSelected,
			sort,
			toggleSort,
			pinColumn,
			stickyHeader,
			resizing,
		],
	)

	// Lift the column-manager dialog's open state, resolve the (default-on)
	// context menus, and derive the header-menu actions; see `useGridMenuActions`.
	const {
		contextMenu: resolvedContextMenu,
		contextMenuEnabled,
		renderDialog,
		showButton,
		managerLabel,
		columnManagerOpen,
		setColumnManagerOpen,
		sortColumn,
		clearSort,
		autoSizeColumns,
		autoSizeConfirmOpen,
		setAutoSizeConfirmOpen,
		confirmAutoSize,
		autoSizeColumn,
		chooseColumns,
	} = useGridMenuActions<T>({
		contextMenu,
		columnManagerConfig,
		resize,
		setSort,
		hasData,
		// A seeded sizing (a restored preference, or an explicit binding seed)
		// makes "Auto-size all columns" confirm before replacing those widths.
		hasSizingPreference:
			Object.keys(columnSizingConfig?.value ?? columnSizingConfig?.defaultValue ?? {}).length > 0,
	})

	// Row manager: the per-group color / order overlay the "Manage rows" dialog
	// edits, reachable from the group-header context menu under client grouping.
	// The wiring (overlay resolution, dialog open state, and the group-header menu
	// resolver) lives in the hook to keep this component within its budget.
	const rowManager = useGridRowManagerRegion<T>({
		groupByConfig,
		groupingActive,
		groupedRows,
		grouping,
		contextMenuActive: resolvedContextMenu != null,
		setGroupExpanded,
	})

	// Column-group band badge menu: Clear color (when colored) + Manage columns.
	const columnGroupMenu = useColumnGroupMenu({
		groups: group.groups,
		setGroups: group.setGroups,
		enabled: group.hasGroups,
		chooseColumns,
		manageLabel: managerLabel,
	})

	// Column reorder rides @dnd-kit's horizontal sortable; the dnd context wraps
	// the whole table region (see `useGridReorder`), and the header reads
	// `canReorder` to register each draggable cell against it. `reorderHandle`
	// picks the grip vs. whole-header drag affordance the headers render.
	const { enabled: reorderEnabled, handle: reorderHandle } = resolveGridReorder(reorder)

	const { canReorder, itemIds, strategy, dndContextProps, activeId } = useGridReorder<T>({
		reorder: reorderEnabled,
		visibleColumns,
		reorderColumns,
		onReorderStart: columnOrderConfig?.onReorderStart,
		onReorderEnd: columnOrderConfig?.onReorderEnd,
	})

	// Row drag-reorder rides @dnd-kit's vertical sortable; `rowReorderPermitted`
	// gates it on the rendered rows matching the natural source order (see there).
	const rowReorder = useGridRowReorder<T>({
		rowReorder: rowReorderConfig,
		enabled: rowReorderPermitted({
			loading,
			hasData,
			paginated: paginationConfig != null,
			virtualized: virtualizeEnabled,
			// Either grouping mode renders its own body; both stand reordering down.
			grouped: groupingMode.active,
			sorted: sort.length > 0,
			renderedCount: renderRows.length,
			sourceCount: rows.length,
		}),
		rows: renderRows,
		rowKeys,
		rowLabel,
	})

	const rowReorderActive = rowReorder.active

	const needsScrollWrapper = stickyHeader || gated.virtualize

	// Resolve the group band row from the rendered columns and their pin sides.
	// `hasGroupRow` is true only when a band actually spans columns, so an empty or
	// fully-ungrouped binding leaves the header a single row.
	const { header: groupHeader, hasGroupRow } = resolveGroupHeaderRow(group, visibleColumns, pinning)

	// The band adds a header row: the aria row count and the body's global row
	// offset each shift by this (0 or 1) so assistive tech counts both header rows.
	// Folded into the count resolver so the indeterminate `-1` sentinel is kept.
	const groupRowOffset = Number(hasGroupRow)

	// The grand-total row aggregates the full filtered set (see
	// `useGridGrandTotal`); it adds a rendered row, so the aria count shifts
	// with it the way the group band does. Manual grouping stands it down —
	// the engine's filtered model would sum the group-header rows as data.
	const grandTotal = useGridGrandTotal({
		grandTotalRow,
		columns: visibleColumns,
		hasRows,
		loading,
		showingError,
		manualGrouped: manualGroupingActive,
		table,
	})

	// The group band and grand-total row each add a rendered header/footer row, so
	// the count spans them; and infinite scroll with more rows to load can't state
	// the whole extent — unless the binding's `totalRows` states it — so the count
	// goes ARIA-indeterminate (`-1`) rather than advertising the loaded window as
	// the full set (see `resolveAriaRowCount`).
	const ariaRowCount = resolveAriaRowCount(
		pagination,
		renderRows.length,
		groupRowOffset + Number(grandTotal.active),
		infiniteScroll,
	)

	// Full filtered row extent (the server total when paginating) for the busy
	// region's result announcement; the header row the aria count adds is excluded.
	const dataRowCount = pagination?.rowCount ?? renderRows.length

	// Live counts for the optional summary footer, read live off `table` so they
	// track client-side search/filtering (see `resolveFooterStats`); `null` when no
	// `footer` is configured, so no bar renders. An infinite-scroll `totalRows`
	// reports the real (server) set rather than the loaded extent.
	const footerStats = resolveFooterStats({
		footer,
		table,
		filteredCount: dataRowCount,
		selected: selection.size,
		infiniteScroll,
	})

	// Grid semantics (role="grid" + global indices) and the select-all label,
	// derived together from the rendered-window mode; see `resolveGridSemantics`.
	// The manual grouped body interleaves header and leaf rows without index
	// bookkeeping, so it stays a native table like the client grouped body.
	const {
		enabled: gridSemantics,
		rowOffset: pageRowOffset,
		selectAllLabel,
	} = resolveGridSemantics(gated.virtualize, pagination, gated.navigable, manualGroupingActive)

	// A clickable grid — any row- or cell-level click handler — reads as
	// actionable through the shared `<Table hover>` wash, layered over any
	// explicit `hover`; the row keeps its own pointer cursor (see `GridRow`).
	// Suppressed through a column drag-resize so the row under the pointer
	// doesn't light up mid-drag.
	const rowHover = resolveHover(
		hover,
		// The composed double-click stands in for the raw prop so the grid's own
		// double-click-to-edit rows carry the hover wash too.
		{ onRowClick, onCellClick, onRowDoubleClick, onCellDoubleClick: cellDoubleClick },
		resizing,
	)

	// Column and row reorder can't share one grid: they'd need one dnd context to
	// disambiguate a header drag from a row drag. Row reorder takes precedence, so
	// column reorder stands down while it's active (documented on `rowReorder`).
	const reorderActive = canReorder && hasData && !rowReorderActive

	// Opt-in row-sort FLIP (see `GridSort.animate`), resolved to the plain body: it
	// stands down under virtualization (windowed rows unmount on scroll, leaving no
	// stable element to glide), under either grouping mode (whose group and leaf
	// rows run their own reveals), and for a reduced-motion user. Row reorder is
	// already mutually exclusive with an active sort, and each row re-checks its own
	// `sortable` besides, so no extra guard is needed here.
	const animateSortRows =
		(sortConfig?.animate ?? false) && !gated.virtualize && !groupingMode.active && !reduceMotion

	// Manual-grouping body wiring for `GridBody`, or `null` outside manual mode.
	const manualGroupBody = useMemo(
		() =>
			resolveManualGroupBody({
				active: manualGroupingActive,
				groupRow,
				expanded: manualExpanded,
				toggle: toggleGroup,
			}),
		[manualGroupingActive, groupRow, manualExpanded, toggleGroup],
	)

	// Sorting the grouped column reorders the group blocks client-side (the engine
	// keeps the rows manual so children stay under their headers); the direction,
	// or `null` when the grouped column isn't sorted, drives that reorder in the body.
	const manualGroupSort = manualGroupSortDirection({
		active: manualGroupingActive,
		sort,
		grouping,
	})

	// The group-by wiring, or `null` while `groupBy.groupButton` is off — the
	// header buttons then render nothing.
	const groupByContext = useMemo(
		() =>
			resolveGroupByContext({
				groupButton: groupByConfig?.groupButton === true,
				grouping,
				setGrouping,
				hasData,
			}),
		[groupByConfig?.groupButton, grouping, setGrouping, hasData],
	)

	// The cursor store is always provided (inert when not navigable/editable); only
	// a cursor grid's cells subscribe, so the wrapper costs nothing otherwise.
	const tableContent = (
		<GridNavContext value={cursor.navStore}>
			<Table
				density={density}
				bleed={bleed}
				striped={stripedForOutline(striped, outline)}
				hover={rowHover}
				className={condensedTableClass(
					condensed,
					cn(tableClassName, bodyStateClass, outlineTableClass(outline)),
				)}
				tableProps={resolveTableProps({
					tableProps,
					// The cursor's tab stop, active-cell pointer, and key/focus handlers.
					navTableProps: cursor.navTableProps,
					// Row/cell roving: the table ref and the arrow-key handler (exclusive
					// with the cursor, which stands roving down).
					rovingTableProps: roving.tableProps,
					loading,
					gridSemantics,
					navigable: cursor.cursorEnabled,
					ariaRowCount,
					colCount: visibleColumns.length,
					multiSelectable: hasSelectionColumn,
					bodyHasRows: hasRows && !loading && !showingError,
					tableWidth,
				})}
			>
				{colGroup}

				<GridHead
					columns={visibleColumns}
					hasRows={hasRows}
					interactive={hasData}
					selectAllLabel={selectAllLabel}
					gridSemantics={gridSemantics}
					reorderable={reorderActive}
					reorderHandle={reorderHandle}
					resize={resize}
					filters={filters}
					pinning={pinning}
					groups={groupHeader}
				/>

				<GridBody<T>
					loading={loading}
					rows={renderRows}
					rowKeys={rowKeys}
					visibleColumns={visibleColumns}
					rowLoading={rowLoading}
					rowClassName={rowClassName}
					rowLabel={rowLabel}
					onRowClick={handleRowClick}
					onCellClick={handleCellClick}
					onRowDoubleClick={handleRowDoubleClick}
					onCellDoubleClick={cellDoubleClick}
					rowRoving={roving.rovingRows}
					rowStaticStop={roving.rowStaticStop}
					cellRoving={roving.rovingCells}
					cellActivate={cellActivate}
					empty={empty}
					error={error}
					gridSemantics={gridSemantics}
					rowIndexOffset={pageRowOffset + groupRowOffset}
					selection={selection}
					toggleRow={toggleRow}
					selectable={hasSelectionColumn}
					reorderable={reorderActive}
					rowReorderActive={rowReorderActive}
					animateSortRows={animateSortRows}
					rowSortable={rowReorder.sortableContext}
					groupedRows={groupedRows}
					manualRows={manualRows}
					manualGroup={manualGroupBody}
					groupColumnId={grouping}
					manualGroupSort={manualGroupSort}
					groupRenderHeader={groupRenderHeader}
					rowGroupPresentation={rowManager.presentation}
					groupTotalRow={groupTotalRow}
					expansion={detail.body}
					getKey={getKey}
					density={density}
					truncate={truncate}
					settleWidths={settleWidths}
					pinning={pinning}
					virtualize={
						gated.virtualize
							? {
									scrollRef,
									estimateSize,
									overscan,
									scrollIntoViewRef: scrollRowIntoViewRef,
									infiniteScroll,
								}
							: null
					}
				/>

				<GridGrandTotalBody<T>
					grandTotal={grandTotal}
					columns={visibleColumns}
					gridSemantics={gridSemantics}
					ariaRowCount={ariaRowCount}
				/>
			</Table>
		</GridNavContext>
	)

	// Mount the editing contexts (the open edit's coord and session) around the
	// table when editable; a read-only grid returns it untouched.
	const cursorContent = cursor.wrap(tableContent)

	// Highlight-mode search (`search.filter === false`): every row stays and the
	// matched substring is marked in each searched cell instead. The debounced query
	// flows to the body cells through context (null while filtering, empty, or
	// unsearched), so a query change re-marks only the cells that read it.
	const highlightQuery = resolveHighlightQuery(searchConfig, globalFilter)

	const tableRegion = (
		<GridHighlightContext value={highlightQuery}>
			<GridScrollRegion active={needsScrollWrapper} scrollRef={scrollRef} maxHeight={maxHeight}>
				{cursorContent}
			</GridScrollRegion>
		</GridHighlightContext>
	)

	return (
		<GridContext value={context}>
			<GridResizingContext value={resizing}>
				<div
					ref={wrapperRef}
					data-slot="grid"
					// Flags an in-flight column drag-resize so the grid paints the resize
					// cursor grid-wide (see `k.wrapper`); head and cells read the matching
					// `resizing` context flag to drop their hover wash and truncation tooltips.
					data-resizing={dataAttr(resizing)}
					className={gridWrapperClass(maxHeight === 'fill')}
				>
					<GridBusyStatus loading={loading} rowCount={dataRowCount} />

					{renderDialog && (
						<GridColumnManagerDialog
							open={columnManagerOpen}
							onOpenChange={setColumnManagerOpen}
							label={managerLabel}
							columns={managerItems}
							order={columnOrder}
							onOrderChange={setColumnOrder}
							reorderable={reorderEnabled}
							hidden={hiddenColumns}
							onHiddenChange={handleHiddenChange}
							onPinChange={pinColumn}
							groups={group.editorGroups}
							onGroupsChange={group.editorSetGroups}
							onSavePreset={columnManagerConfig?.onSavePreset}
						/>
					)}

					<GridRowManagerRegionDialog region={rowManager} />

					{confirmAutoSize && (
						<GridAutoSizeConfirmDialog
							open={autoSizeConfirmOpen}
							onOpenChange={setAutoSizeConfirmOpen}
							onConfirm={confirmAutoSize}
						/>
					)}

					<GridToolbar
						filter={globalFilter}
						showColumnManager={showButton}
						columnManagerLabel={managerLabel}
						onManageColumns={() => setColumnManagerOpen(true)}
						exportActions={exportActions}
						columnFilters={filters}
						batchActions={batchActions}
						hasSelection={someSelected}
						selection={selection}
						setSelection={setSelection}
					/>

					<GridGroupByContext value={groupByContext}>
						<GridRegion
							canReorder={reorderActive}
							dndContextProps={dndContextProps}
							itemIds={itemIds}
							strategy={strategy}
							activeReorderId={activeId}
							contextMenu={resolvedContextMenu}
							contextMenuEnabled={contextMenuEnabled}
							columns={visibleColumns}
							rows={renderRows}
							rowKeys={rowKeys}
							sort={sort}
							sortColumn={sortColumn}
							clearSort={clearSort}
							pinColumn={pinColumn}
							groupBy={groupByContext}
							autoSizeColumns={autoSizeColumns}
							autoSizeColumn={autoSizeColumn}
							chooseColumns={chooseColumns}
							exportActions={exportActions}
							rowGroupMenu={rowManager.rowGroupMenu}
							columnGroupMenu={columnGroupMenu}
						>
							<GridRowReorderRegion
								active={rowReorderActive}
								dndContextProps={rowReorder.dndContextProps}
							>
								<DensityCascade level={density}>{tableRegion}</DensityCascade>
							</GridRowReorderRegion>
						</GridRegion>
					</GridGroupByContext>

					<GridFooterBar config={footer} stats={footerStats} />

					{pagination && <GridPaginationFooter pagination={pagination} />}
				</div>
			</GridResizingContext>
		</GridContext>
	)
}
