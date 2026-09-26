'use client'

import { useReducedMotion } from 'motion/react'
import {
	useCallback,
	useEffect,
	useImperativeHandle,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { announce, dataAttr } from '../../core'
import { useA11yAnnouncements, useComposedRef, useControllable } from '../../hooks'
import { useStableEvent } from '../../hooks/use-stable-event'
import { useDensity } from '../../primitives/density'
import { useDensityLevel } from '../../providers/density'
import { isDataColumn } from '../../utilities'
import { GridContext, GridSettleContext } from './context'
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
import type { GridGroup } from './engine/grid-group/tree'
import { bodyRowCount } from './engine/grid-items/items'
import { resolveNewRowAddWidth, withNewRowAddColumn } from './engine/grid-new-row-column'
import { applyPinOverrides, type PinSide, toPinOverrides } from './engine/grid-pin/overrides'
import { resolveGridReorder } from './engine/grid-reorder-compute'
import {
	bridgeCellActivate,
	bridgeRowActivate,
	buildRovingCellActivate,
	composeCellDoubleClick,
} from './engine/grid-row/bridges'
import { gridWrapperClass, resolveDensity } from './engine/grid-table/classes'
import { assertGridProps, implyVirtualize } from './engine/grid-table/guards'
import {
	seedColumnManager,
	seedColumnOrder,
	seedColumnSizing,
	seedPinning,
} from './engine/grid-table/seeds'
import { GridBusyStatus } from './grid-busy-status'
import { useColumnGroupMenu } from './grid-context-menu'
import { GridDataDialogs } from './grid-data-dialogs'
import {
	placeNewRow,
	resolveActionable,
	resolveAriaRowCount,
	resolveFooterStats,
	resolveGridSemantics,
	resolveHighlightQuery,
	resolveHover,
	resolveInfiniteScroll,
	resolveResizeLayout,
	resolveSortable,
	resolveVirtualization,
	rowReorderPermitted,
	widthGateClass,
} from './grid-data-resolvers'
import { GridDataTable } from './grid-data-table'
import type { GridDataProps, GridEditSource, GridPinningState } from './grid-data-types'
import { GridExportOverlay } from './grid-export-overlay'
import { GridFooterBar } from './grid-footer-bar'
import { GridGroupByContext } from './grid-group-by-button'
import { useGridMenuActions } from './grid-menu-actions'
import { GridPagination as GridPaginationFooter } from './grid-pagination'
import {
	DensityCascade,
	GridOverlayDensityContext,
	GridRegion,
	GridRowReorderRegion,
} from './grid-region'
import { useGridSort, useServerSortSettle } from './grid-sort-state'
import { GridToolbar } from './grid-toolbar'
import { resolveGrandTotal } from './grid-total-row'
import type { GridScrollRowIntoView } from './grid-virtualized-body'
import type { GridColumn } from './types'
import { useGridColumns } from './use-grid-columns'
import { useGridCursor } from './use-grid-cursor'
import { useGridExpansion } from './use-grid-expansion'
import { useGridExport } from './use-grid-export'
import { useGridGroup } from './use-grid-group'
import { useGridReorder } from './use-grid-reorder'
import { useGridRoving } from './use-grid-roving'
import { useGridRowGrouping } from './use-grid-row-grouping'
import { useGridRowManagerRegion } from './use-grid-row-manager'
import { useGridRowReorder } from './use-grid-row-reorder'
import { useGridSelectionActions, useGridSelectionState } from './use-grid-selection'
import { useGridTable } from './use-grid-table'

/**
 * {@link bodyRowCount}, memoized. A windowed grouped or master-detail body
 * walks each group or row to count its rows. The count therefore runs again
 * only when the rows, the columns, or an expansion change. Kept a hook so the memo stays
 * off {@link GridData}'s complexity budget. @internal
 */
function useBodyRowCount<T>(args: {
	virtualize: boolean
	rows: T[]
	rowKeys: (string | number)[]
	/** The client groups. A toggle gives a new list, so the count follows it. */
	groups: GridGroup<T>[] | null
	groupTotalRow: boolean | undefined
	columns: GridColumn<T>[]
	expanded: Set<string | number> | undefined
	rowExpandable: ((row: T) => boolean) | undefined
}): number {
	const { virtualize, rows, rowKeys, groups, groupTotalRow, columns } = args

	const { expanded, rowExpandable } = args

	return useMemo(
		() =>
			bodyRowCount({
				virtualize,
				rows,
				rowKeys,
				groups,
				groupTotalRow,
				columns,
				expansion: expanded && rowExpandable ? { expanded, rowExpandable } : null,
			}),
		[virtualize, rows, rowKeys, groups, groupTotalRow, columns, expanded, rowExpandable],
	)
}

/**
 * Dev-only guard against a `maxHeight` that can never bind. The grid's wrapper
 * is auto-height, so a *percentage* resolves to no constraint. The scroll
 * container then silently unbinds, virtualization degrades to rendering every
 * row, and infinite scroll loses its window. Warns once per value; the `'fill'`
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
 * Stabilizes a consumer event callback (`onRowClick`, `onCellClick`, and their
 * double-click counterparts) so the memoized rows hold across renders. It
 * returns a referentially-stable handler, or `undefined` when no callback is
 * set. That handler reads the live callback through a ref, so an inline
 * consumer callback doesn't churn every row.
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
 * Whether the table can paint — latched on, once.
 *
 * A reload paints the server's HTML first, and the server cannot have measured anything.
 * Its colgroup therefore carries the declared widths, and the fit that runs at hydration
 * replaces them. That repaint is the column jump. Nothing can compute a content fit
 * before the DOM exists, so rather than paint a width that is about to change, paint none (see
 * {@link widthGateClass}).
 *
 * `settled` waits for a width pass that read real body cells. Some bodies have no data
 * cells to read, so the gate also opens for them:
 *
 * - `loading`: the skeleton is the state to show. A hidden skeleton shows nothing for all
 *   of the fetch. The columns can fit again when the rows land.
 * - `failed`: the error slot replaces the rows, so no pass reads a body cell.
 * - no rows: the header and the empty state are all there is to show.
 *
 * `settled` is true from the first frame for any grid the autosizer does not size. Such a
 * grid is not resizable, has its sizing controlled by the consumer, or has no
 * `ResizeObserver` (SSR and jsdom). Those paint immediately and nothing regresses.
 *
 * Latched because the reveal is a one-way door. `loading` goes true again on page two, a
 * filter, and a re-sort. Blanking a table the user is already reading would be far worse
 * than the first-paint jump this exists to prevent. Monotonic, so writing it during render
 * stays idempotent under StrictMode's double pass. Kept out of {@link GridData} for its
 * cognitive-complexity budget.
 *
 * @internal
 */
function useTableRevealed(
	settled: boolean,
	loading: boolean,
	failed: boolean,
	rowCount: number,
): boolean {
	const revealed = useRef(false)

	if (settled || loading || failed || rowCount === 0) revealed.current = true

	return revealed.current
}

/**
 * The data-grid implementation behind {@link Grid}, read-only and editable.
 * {@link Grid} renders it through a memoized wrapper.
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
	columnGroups: groupsConfig,
	groupBy: groupByConfig,
	groupTotalRow,
	grandTotalRow,
	expandable: expandableConfig,
	pagination: paginationConfig,
	resizable = true,
	toolbar,
	width = 'fill',
	columnSizing: columnSizingConfigProp,
	search: searchConfig,
	columnFilters: columnFiltersConfig,
	contextMenu,
	exportable = DEFAULT_EXPORTABLE,
	exportRows,
	reorder = false,
	rowReorder: rowReorderConfig,
	navigable = false,
	onActiveCellChange,
	onCollapsedChange,
	editable,
	ref,
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

	// `columnManager={false}` is the feature's off switch: the seed flattens it to
	// no bindings at all, and the menu actions read the switch off the raw prop.
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

	// Read here, above `DensityCascade`, so it is the density *surrounding* the grid
	// — what an overlay the grid spawns renders at (see `GridOverlayDensity`).
	const overlayDensity = useDensity()

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
	// its own body, so it stands down the cursor and pagination below. Manual
	// grouping also stands virtualization down.
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

	// Manual grouping stands the cursor down. Client grouping and master-detail
	// give the cursor an order of rows. Manual grouping also stands virtualization down, and the other two keep an
	// explicit `virtualize`. Client grouping stands pagination down, manual
	// grouping keeps a manual one, and master-detail keeps any (see
	// `resolveGroupingGates`).
	const gated = resolveGroupingGates({
		groupingActive,
		manualGroupingActive,
		expandableActive: detail.active,
		navigable,
		virtualize: virtualizeEnabled,
		virtualizeProp: virtualize,
		pagination: paginationConfig,
	})

	// Infinite scroll layers on the flat virtualized window, so it stands down
	// under a self-rendering body (`gated.infiniteScroll`). Its `threshold`
	// defaults to the window's `overscan`, so the fetch leads the viewport by that
	// margin; the source `rows` length derives `hasMore` when a `totalRows` is supplied.
	const infiniteScroll = gated.infiniteScroll
		? resolveInfiniteScroll(infiniteScrollConfig, overscan, rows.length)
		: null

	// Resolves a column's display label at call time, read by the stable `pinColumn`
	// and the visibility handler so they can narrate the change without closing over
	// (and re-creating on) the columns.
	const labelOfColumn = useStableEvent((id: string | number) => {
		const column = pinnedColumns.find((candidate) => candidate.id === id)

		return column ? columnLabel(column) : String(id)
	})

	const pinColumn = useCallback(
		(id: string | number, side: PinSide | false) => {
			setPinningState((prev) => ({ ...prev, [String(id)]: side === false ? 'none' : side }))

			// Narrate the pin change; the header gives no visible text cue (WCAG 4.1.3).
			// The words name the physical edge, so they read the grid's direction.
			const rtl =
				wrapperRef.current !== null && getComputedStyle(wrapperRef.current).direction === 'rtl'

			announce(describePin(labelOfColumn(id), side, rtl))
		},
		[setPinningState, labelOfColumn],
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

	// The editing layer's commit path resolves a staged draft against the grid's
	// own inputs, not against the refs above: those narrow to what the window
	// renders, and a draft can outlive that window.
	const editSource: GridEditSource<T> = { rows, columns, getKey, rowLabel }

	const editSourceRef = useRef(editSource)

	editSourceRef.current = editSource

	// Selection wiring the cursor reads at key time: whether a selection column is
	// present (gating Space-to-select) and a toggle for the active row by display
	// index. Both resolve after the engine produces `rowKeys`. The cursor reads the
	// first through a ref, like its bounds above. The toggle names `toggleRow`
	// before its declaration below; the cursor calls it as an effect event, at key
	// time, when this render's `toggleRow` is in place.
	const selectableRef = useRef(false)

	const toggleActiveRow = (rowIdx: number) => {
		const key = rowKeysRef.current[rowIdx]

		if (key !== undefined) toggleRow(key)
	}

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

	// The consumer's `tableProps.ref` and the grid's own ref, on one node. The
	// cursor reads the grid's ref to reseat focus on its own tab stop.
	const tableElementRef = useComposedRef(tableRef, tableProps?.ref)

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
	const group = useGridGroup(groupsConfig, onCollapsedChange)

	// The cursor + editing layer: the augmented columns, the `<table>` cursor
	// props, the cursor store, and the row-editing-context wrapper. Inert for a
	// static grid.
	const cursor = useGridCursor<T>({
		// Manual grouping stands the navigable cursor down (see `gated`).
		navigable: gated.navigable,
		editable,
		columns: pinnedColumns,
		onRowActivate,
		onCellActivate,
		onActiveCellChange,
		selectableRef,
		toggleActiveRow,
		scrollRowIntoViewRef,
		scrollContainerRef: scrollRef,
		tableRef,
		refs: {
			rowsRef,
			colCountRef,
			rowIndexMapRef,
			colIndexMapRef,
			rowKeysRef,
			dataColumnsRef,
			editSourceRef,
		},
	})

	// The grid's commands on its `ref` (see `GridHandle`).
	const { stepHistory } = cursor

	useImperativeHandle(
		ref,
		() => ({ undo: () => stepHistory('undo'), redo: () => stepHistory('redo') }),
		[stepHistory],
	)

	// Double-click-to-edit (under `editable.session: 'managed'`) rides the
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

	// Selection state lives above the engine, so an export can read it; the
	// row-derived flags and toggles come after the engine produces `rowKeys` (see
	// `useGridSelectionActions` below).
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
				if (!prev.has(id)) announce(describeColumnVisibility(labelOfColumn(id), true))
			}

			for (const id of prev) {
				if (!next.has(id)) announce(describeColumnVisibility(labelOfColumn(id), false))
			}

			setHiddenColumns(next)
		},
		[setHiddenColumns, labelOfColumn],
	)

	// Measured to auto-size resizable columns to fill the available width.
	const wrapperRef = useRef<HTMLDivElement>(null)

	// Manual grouping marks the consumer's group-header rows for the engine's
	// row-model split; `null` otherwise (see `manualGroupPredicate`).
	const manualGroupRow = useMemo(
		() => manualGroupPredicate(manualGroupingActive, groupRow),
		[manualGroupingActive, groupRow],
	)

	// The new-row slot's Add control has a column of its own after the others
	// (see `withNewRowAddColumn`). It joins here, after the column order and
	// visibility state, so no saved state names it. It follows the configured
	// slot, not the loading state, so the column set stays stable. Its width is
	// the one the Add cell measures for its control, unless `newRowAdd.width`
	// fixes it.
	const [measuredAddWidth, setMeasuredAddWidth] = useState<number | null>(null)

	const addWidth = resolveNewRowAddWidth(
		cursor.newRow !== null,
		editable?.newRowAdd,
		measuredAddWidth,
	)

	const engineColumns = useMemo(
		() => withNewRowAddColumn(cursor.columns, addWidth),
		[cursor.columns, addWidth],
	)

	// TanStack Table is the data engine: rows flow through its row model, which
	// also surfaces the pagination state and handlers the footer renders from.
	// Without an active client transform the model is bypassed, and `renderRows`
	// is the sorted view or `rows` itself.
	const {
		visibleColumns,
		renderRows,
		rowKeys,
		groups,
		toggleGroup: toggleClientGroup,
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
	} = useGridTable<T>({
		rows,
		// The engine receives the full column set and resolves which render (and
		// in what order) from the order / visibility / pinning state below;
		// `visibleColumns` comes back in that resolved order for the header and body.
		// Under a cursor (navigable or editable) these carry the cursor/editor
		// wiring (see `useGridCursor`).
		columns: engineColumns,
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
		// `fit` sizes the columns to their content instead of to the container, for a
		// container built around the grid (see `GridDataProps.width`).
		fitContent: width === 'fit',
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
		// The engine builds its filtered model only for a grand total.
		grandTotal: grandTotalRow,
	})

	// Cursor index space: rendered rows and the visible *data* columns. It skips the
	// non-data columns (selection, actions, drag handle, expander). Synced from the refs here — after the engine resolves
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

	// Only the cursor reads the row indices, so a grid with no cursor skips the
	// map, which is one entry for each row.
	const { cursorEnabled } = cursor

	const rowIndexMap = useMemo(
		() => new Map(cursorEnabled ? renderRows.map((row, i) => [row, i] as const) : undefined),
		[cursorEnabled, renderRows],
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
	// The new-row slot counts as a row of the cursor's order, so a change to it
	// clamps too.
	useLayoutEffect(() => {
		void cursor.newRow

		cursor.reconcile(renderRows.length, dataColumns.length)
	}, [cursor.reconcile, cursor.newRow, renderRows.length, dataColumns.length])

	// Visible rows drive the select-all checkbox.
	const hasRows = renderRows.length > 0

	// Column interactions stand down when there's no data to act on (incl. while
	// loading), or when an error has pre-empted the body — mirroring the empty
	// state, since both replace the rows there's nothing to act on. `showingError`
	// tracks the body's own error branch (see `GridBody`), which loading takes
	// precedence over.
	const showingError = !loading && error != null && error !== false

	// `hasRowsToActOn` is the plain row-presence fact; `hasData` also holds when a
	// filter or search is what emptied the view, so the header stays live and the rule
	// that emptied it can be cleared (see `resolveActionable`).
	const { hasRows: hasRowsToActOn, hasData } = resolveActionable({
		sourceCount: rows.length,
		showingError,
		filters,
		globalFilter,
	})

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

	// Feed the cursor's selection ref now that the engine has resolved it, so its
	// Space key toggles the active row's selection (see `useGridNavigation`).
	selectableRef.current = hasSelectionColumn

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
	// displayed order. Both are taken over the leaf set, since under grouping the
	// sorted model carries group headers rather than data rows. An `exportRows`
	// source overrides both, supplying the rows the engine can't hold under
	// server pagination. Split by surface: the toolbar's "Export" dropdown and
	// both context menus each take the set their own switch opens.
	const exportActions = useGridExport<T>({
		exportable,
		columns: visibleColumns,
		rows: rowsForExport,
		exportRows,
	})

	// Whether the table can paint yet; holds its first frame until the widths are
	// settled (see `useTableRevealed`, and the width gate on the `<table>` below).
	const showTable = useTableRevealed(widthsSettled, loading, showingError, renderRows.length)

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

	// `resizing` stays on this table-wide value for external `useGrid()` consumers.
	// The grid's own truncating head and cells read the drag state of the settle
	// store (see `useGridResizing`), so a sort or a select-all, which churns this
	// value, does not render every visible truncating cell again.
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
		resetColumnWidths,
		widthConfirmOpen,
		setWidthConfirmOpen,
		widthAction,
		confirmWidthAction,
		autoSizeColumn,
		chooseColumns,
	} = useGridMenuActions<T>({
		contextMenu,
		columnManager: columnManagerConfigProp,
		resize,
		setSort,
		hasData,
		// A seeded sizing (a restored preference, or an explicit binding seed) makes
		// "Auto-size all columns" and "Reset column widths" confirm before they
		// discard those widths.
		hasSizingPreference:
			Object.keys(columnSizingConfig?.value ?? columnSizingConfig?.defaultValue ?? {}).length > 0,
	})

	// The direction of the grid, read from its wrapper. The manager dialog portals
	// out of the grid, so it takes this direction through its `dir` and through
	// context. The read runs on mount and each time the manager opens, not on
	// each render, because a computed-style read can force a style pass.
	const [direction, setDirection] = useState<'ltr' | 'rtl'>('ltr')

	// biome-ignore lint/correctness/useExhaustiveDependencies: the open state is the trigger for a fresh read, not an input.
	useLayoutEffect(() => {
		const wrapper = wrapperRef.current

		if (!wrapper) return

		setDirection(getComputedStyle(wrapper).direction === 'rtl' ? 'rtl' : 'ltr')
	}, [columnManagerOpen])

	// Row manager: the per-group color / order overlay the "Manage rows" dialog
	// edits, reachable from the group-header context menu under client grouping.
	// The wiring (overlay resolution, dialog open state, and the group-header menu
	// resolver) lives in the hook to keep this component within its budget.
	const rowManager = useGridRowManagerRegion<T>({
		groupByConfig,
		groupingActive,
		groups,
		toggleGroup: toggleClientGroup,
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
			// Rows, not the header's interactivity: dragging one needs a row to drag,
			// which an emptied-by-a-filter grid hasn't got.
			hasRows: hasRowsToActOn,
			paginated: paginationConfig != null,
			virtualized: virtualizeEnabled,
			// Either grouping mode renders its own body; both stand reordering down.
			grouped: groupingMode.active,
			expanded: detail.active,
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
	// `resolveGrandTotal`); it adds a rendered row, so the aria count shifts
	// with it the way the group band does. Manual grouping stands it down —
	// the engine's filtered model would sum the group-header rows as data.
	const grandTotal = resolveGrandTotal({
		grandTotalRow,
		columns: visibleColumns,
		hasRows,
		loading,
		showingError,
		manualGrouped: manualGroupingActive,
		rows: grandTotalRows,
	})

	// The group band and grand-total row each add a rendered header/footer row, so
	// the count spans them; and infinite scroll with more rows to load can't state
	// the whole extent — unless the binding's `totalRows` states it — so the count
	// goes ARIA-indeterminate (`-1`) rather than advertising the loaded window as
	// the full set (see `resolveAriaRowCount`).
	// The new-row slot of an editable grid is a real row of the grid, so it
	// counts too. It shows only over a body that shows data or its empty state.
	const newRowPlace = placeNewRow(cursor.newRow, loading, showingError)

	// A windowed grouped or master-detail body counts its headers, totals, and
	// open detail panels as rows (see `bodyRowCount`).
	const ariaRowCount = resolveAriaRowCount(
		pagination,
		useBodyRowCount({
			virtualize: gated.virtualize,
			rows: renderRows,
			rowKeys,
			groups,
			groupTotalRow,
			columns: visibleColumns,
			expanded: detail.body?.expanded,
			rowExpandable: detail.body?.rowExpandable,
		}),
		groupRowOffset + Number(grandTotal.active) + Number(newRowPlace !== null),
		infiniteScroll,
	)

	// Full filtered row extent (the server total when paginating) for the busy
	// region's result announcement; the header row the aria count adds is excluded.
	const dataRowCount = pagination?.rowCount ?? renderRows.length

	// Counts for the optional summary footer, which track client-side
	// search/filtering (see `resolveFooterStats`); `null` when no `footer` is
	// configured, so no bar renders. An infinite-scroll `totalRows` reports the
	// real (server) set rather than the loaded extent.
	const footerStats = resolveFooterStats({
		footer,
		sourceCount: rows.length,
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

	// Highlight-mode search (`search.mode === 'highlight'`): every row stays and the
	// matched substring is marked in each searched cell instead. The debounced query
	// flows to the body cells through context (null while filtering, empty, or
	// unsearched), so a query change re-marks only the cells that read it.
	const highlightQuery = resolveHighlightQuery(searchConfig, globalFilter)

	const tableRegion = (
		<GridDataTable<T>
			columns={visibleColumns}
			pinning={pinning}
			density={density}
			loading={loading}
			showingError={showingError}
			hasRows={hasRows}
			cursor={cursor}
			roving={roving}
			table={{
				bleed,
				striped,
				outline,
				condensed,
				hover: rowHover,
				className: tableClassName,
				// While a server-side (manual) sort is in flight, the data body pulses at a
				// reduced opacity until the reordered rows land (see `settleBodyClass`).
				// `serverSortSettling` is only ever set under a manual sort, so a
				// client-sorted grid's table class is untouched.
				settling: serverSortSettling,
				revealed: showTable,
				width: tableWidth,
				colGroup,
				props: { ...tableProps, ref: tableElementRef },
				tree: groupingActive,
				multiSelectable: hasSelectionColumn,
			}}
			semantics={{
				enabled: gridSemantics,
				rowOffset: pageRowOffset,
				groupRowOffset,
				ariaRowCount,
				selectAllLabel,
			}}
			head={{
				interactive: hasData,
				reorderable: reorderActive,
				reorderHandle,
				resize,
				filters,
				groups: groupHeader,
			}}
			body={{
				rows: renderRows,
				rowKeys,
				rowLoading,
				rowClassName,
				rowLabel,
				onRowClick: handleRowClick,
				onCellClick: handleCellClick,
				onRowDoubleClick: handleRowDoubleClick,
				onCellDoubleClick: cellDoubleClick,
				cellActivate,
				empty,
				error,
				selection,
				toggleRow,
				selectable: hasSelectionColumn,
				reorderable: reorderActive,
				rowReorderActive,
				animateSortRows,
				rowSortable: rowReorder.sortableContext,
				groups,
				toggleGroup: toggleClientGroup,
				manualRows,
				manualGroup: manualGroupBody,
				groupColumnId: grouping,
				manualGroupSort,
				groupRenderHeader,
				rowGroupPresentation: rowManager.presentation,
				groupTotalRow,
				expansion: detail.body,
				truncate,
				virtualize: gated.virtualize
					? {
							scrollRef,
							estimateSize,
							overscan,
							scrollIntoViewRef: scrollRowIntoViewRef,
							infiniteScroll,
							fitRenderedRows,
							stickyHeader,
						}
					: null,
			}}
			newRow={{
				place: newRowPlace,
				add: editable?.newRowAdd || undefined,
				onMeasureAdd: setMeasuredAddWidth,
			}}
			grandTotal={grandTotal}
			scroll={{
				active: needsScrollWrapper,
				scrollRef,
				maxHeight,
				expandable: detail.active,
				grouped: groupingMode.active,
				virtualized: gated.virtualize,
			}}
			highlightQuery={highlightQuery}
		/>
	)

	return (
		<GridContext value={context}>
			<GridOverlayDensityContext value={overlayDensity}>
				<GridSettleContext value={settle}>
					<div
						ref={wrapperRef}
						data-slot="grid"
						// Flags an in-flight column drag-resize on the grid root. The resize
						// cursor comes from the handle, which captures the pointer for the drag.
						// Head and cells read the matching drag state of the settle store to drop
						// their hover wash and truncation tooltips.
						data-resizing={dataAttr(resizing)}
						className={gridWrapperClass(maxHeight === 'fill')}
					>
						<GridBusyStatus loading={loading} rowCount={dataRowCount} />

						{/* Covers the grid — toolbar included — while an async export resolves
					    its rows, whichever surface started it. */}
						<GridExportOverlay active={exportActions.pending} />

						<GridDataDialogs
							direction={direction}
							columnManager={
								renderDialog
									? {
											open: columnManagerOpen,
											onOpenChange: setColumnManagerOpen,
											label: managerLabel,
											manager: {
												columns: managerItems,
												filterable: columnManagerConfig?.filterable,
												order: columnOrder,
												onOrderChange: setColumnOrder,
												reorderable: reorderEnabled,
												hidden: hiddenColumns,
												onHiddenChange: handleHiddenChange,
												onPinChange: pinColumn,
												groups: group.editorGroups,
												onGroupsChange: group.editorSetGroups,
												onSavePreset: columnManagerConfig?.onSavePreset,
											},
										}
									: null
							}
							rowManager={rowManager}
							widthConfirm={
								confirmWidthAction
									? {
											open: widthConfirmOpen,
											onOpenChange: setWidthConfirmOpen,
											action: widthAction,
											onConfirm: confirmWidthAction,
										}
									: null
							}
						/>

						<GridToolbar
							filter={globalFilter}
							content={toolbar}
							showColumnManager={showButton}
							columnManagerLabel={managerLabel}
							onManageColumns={() => setColumnManagerOpen(true)}
							exportActions={exportActions.toolbar}
							exporting={exportActions.pending}
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
								resetColumnWidths={resetColumnWidths}
								chooseColumns={chooseColumns}
								exportActions={exportActions.contextMenu}
								rowGroupMenu={rowManager.rowGroupMenu}
								columnGroupMenu={columnGroupMenu}
								columnFilter={filters}
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
				</GridSettleContext>
			</GridOverlayDensityContext>
		</GridContext>
	)
}
