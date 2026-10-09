'use client'

import { type RefObject, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { dataAttr } from '../../core'
import { useComposedRef } from '../../hooks'
import { isRtl } from '../../hooks/a11y/logical-arrow'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'
import { useDensityStep } from '../../primitives/density'
import { GridContext, GridSettleContext } from './context'
import { gridWrapperClass, resolveStep } from './engine/grid-data/classes'
import { assertGridProps } from './engine/grid-data/guards'
import { DEFAULT_EXPORTABLE } from './engine/grid-export/registry'
import { manualGroupPredicate } from './engine/grid-group/resolve'
import { resolveGridReorder } from './engine/grid-reorder-compute'
import { GridBusyStatus } from './grid-busy-status'
import { GridDataDialogs } from './grid-data-dialogs'
import { resolveHighlightQuery, rowReorderPermitted } from './grid-data-resolvers'
import { GridDataTable } from './grid-data-table'
import type { GridDataProps, GridEditSource } from './grid-data-types'
import { GridExportOverlay } from './grid-export-overlay'
import { GridFooterBar } from './grid-footer-bar'
import { GridGroupByContext } from './grid-group-by-button'
import { useGridMenuActions } from './grid-menu-actions'
import { GridPagination as GridPaginationFooter } from './grid-pagination'
import { GridOverlayDensityContext, GridRegion } from './grid-region'
import { useGridSort, useServerSortSettle } from './grid-sort-state'
import { GridToolbar } from './grid-toolbar'
import { useGridColumnGroupMenu } from './use-grid-column-group-menu'
import { useGridDataColumns } from './use-grid-data-columns'
import { useGridDataCursor, useGridIndexRefs } from './use-grid-data-cursor'
import { useGridDataFrame } from './use-grid-data-frame'
import { useGridDataView } from './use-grid-data-view'
import { useGridExport } from './use-grid-export'
import type { GridScrollRowIntoView } from './use-grid-navigation'
import { useGridReorder } from './use-grid-reorder'
import { useGridRowHeight } from './use-grid-row-height'
import { useGridRowManagerRegion } from './use-grid-row-manager'
import { useGridRowReorder } from './use-grid-row-reorder'
import { useGridSelectionState } from './use-grid-selection'
import { useGridTable } from './use-grid-table'

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
 * The data-grid implementation behind {@link Grid}, read-only and editable.
 * {@link Grid} renders it through a memoized wrapper.
 *
 * @remarks The body runs in phases, and the data goes down only. Each path
 * back up has one named mechanism: the `GridIndexRefs` bundle, the
 * `wrapperRef` that `GridData` makes, and `setMeasuredAddWidth`, which goes down
 * as a prop. No context is between the phases, so the flow stays visible here.
 * A split by feature does not work, because grouping gates the cursor, the
 * engine, and the frame.
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
	range = false,
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
	size,
	condensed = false,
	bleed,
	outline,
	striped,
	hover,
	className,
}: GridDataProps<T>) {
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

	// The painted step: an explicit `size`, or `sm` under `condensed`, which is a
	// tight preset for every density-derived metric. It becomes the scope of the
	// table. Without it, the table writes no scope, and the cells, the resize
	// metrics, and the reveal padding take the step of the nearest scope in CSS.
	// So the server markup is right at the first paint.
	const density = resolveStep(condensed, size)

	// Read here, above the scope of the table, so it is the density *surrounding*
	// the grid — what an overlay the grid spawns renders at (see
	// `GridOverlayDensity`).
	const overlayDensity = useDensityStep()

	// The step as a JS value, for the work after mount that needs a number: the
	// virtualizer's row estimate and the autosizer's refit key. With no scope of
	// its own, the table takes the step around the grid.
	const step = density ?? overlayDensity

	// Sticky header pins the header row while the body scrolls (forcing a scroll
	// wrapper); resolved from the `header` config's `position`.
	const stickyHeader = header?.position === 'sticky'

	// The grid's root. The autosizer measures it to fit resizable columns to the
	// available width, and a pin narration reads its direction.
	const wrapperRef = useRef<HTMLDivElement>(null)

	// Published by the virtualized body while mounted (null otherwise), so the cursor
	// can scroll an off-window row into the rendered window before pointing
	// `aria-activedescendant` at it.
	const scrollRowIntoViewRef = useRef<GridScrollRowIntoView | null>(null)

	// The grid's scroll container (sticky/virtualized), attached through the scroll
	// region; the cursor measures it for the viewport-relative PageUp/Down step.
	const scrollRef = useRef<HTMLDivElement>(null)

	// The grid `<table>`, the roving container for row/cell keyboard navigation
	// (see `useGridRoving`), attached through `resolveTableProps`.
	const tableRef = useRef<HTMLTableElement>(null)

	// Phase 1: the columns, the pin state, row grouping, and the gates it sets.
	const {
		columnOrderConfig,
		columnSizingConfig,
		columnManagerConfig,
		estimateSize,
		overscan,
		pinnedColumns,
		pinColumn,
		rowGrouping,
		groupingMode,
		detail,
		gated,
		infiniteScroll,
		group,
		columnState,
		handleHiddenChange,
	} = useGridDataColumns<T>({
		columns,
		rowCount: rows.length,
		preferences,
		columnOrder: columnOrderConfigProp,
		pinning: pinningConfigProp,
		columnManager: columnManagerConfigProp,
		columnSizing: columnSizingConfigProp,
		columnGroups: groupsConfig,
		onCollapsedChange,
		groupBy: groupByConfig,
		expandable: expandableConfig,
		navigable,
		virtualize,
		infiniteScroll: infiniteScrollConfig,
		pagination: paginationConfig,
		wrapperRef,
	})

	// A windowed grid without an `estimateSize` takes its estimate from a
	// measured row (see `useGridRowHeight`). A body that grouping keeps
	// unwindowed reads no estimate, so it measures nothing.
	const { rowHeight, measureRef } = useGridRowHeight(
		gated.virtualize && estimateSize === undefined,
		step,
	)

	// The consumer's `tableProps.ref`, the grid's own ref, and the row measure,
	// on one node. The cursor reads the grid's ref to reseat focus on its own
	// tab stop.
	const tableElementRef = useComposedRef(tableRef, measureRef, tableProps?.ref)

	const {
		grouping,
		setGrouping,
		groupRow,
		expanded: groupExpanded,
		setExpanded: setGroupExpanded,
		manualExpanded,
		toggleGroup,
		renderHeader: groupRenderHeader,
	} = rowGrouping

	const { groupingActive, manualGroupingActive } = groupingMode

	const {
		columnOrder,
		setColumnOrder,
		hiddenColumns,
		columnVisibility,
		reorderColumns,
		managerItems,
	} = columnState

	// Phase 2: the keyboard cursor and its editing layer. The cursor reads the
	// index state that the view phase resolves, through these refs.
	const editSource: GridEditSource<T> = { rows, columns, getKey, rowLabel }

	const indexRefs = useGridIndexRefs(editSource)

	const {
		cursor,
		handleRowClick,
		handleCellClick,
		handleRowDoubleClick,
		cellDoubleClick,
		cellActivate,
		engineColumns,
		setMeasuredAddWidth,
	} = useGridDataCursor<T>({
		refs: indexRefs,
		// Manual grouping stands the navigable cursor down (see `gated`).
		navigable: gated.navigable,
		range,
		editable,
		columns: pinnedColumns,
		source: editSource,
		onActiveCellChange,
		onRowClick,
		onCellClick,
		onRowDoubleClick,
		onCellDoubleClick,
		scrollRowIntoViewRef,
		scrollRef,
		tableRef,
		ref,
	})

	const { sort, setSort, toggleSort } = useGridSort(sortConfig)

	// Server-side (manual) sort pulses the rows at a reduced opacity from the moment
	// the grid emits the sort change until the consumer hands back the reordered
	// rows, so the current rows stay readable while they reorder (see `k.body`). Off
	// for client sorting, where the grid sorts a view of `rows` with no round trip.
	const sortManual = sortConfig?.manual ?? false

	const serverSortSettling = useServerSortSettle({ enabled: sortManual, sort, rows })

	// Drives the opt-in row-sort FLIP down through `GridBody`; read here so the
	// gate stands the animation down for a reduced-motion user (WCAG 2.3.3) — a
	// `MotionConfig` alone would not, since it leaves `layout` animations running.
	const reduceMotion = usePrefersReducedMotion()

	// Selection state lives above the engine, so an export can read it; the
	// row-derived flags and toggles come after the engine produces `rowKeys` (see
	// the view phase).
	const { selection, setSelection } = useGridSelectionState(selectionConfig)

	const batchActions = selectionConfig?.batchActions

	// Manual grouping marks the consumer's group-header rows, so the grid splits
	// the headers from the leaves; `null` otherwise (see `manualGroupPredicate`).
	const manualGroupRow = useMemo(
		() => manualGroupPredicate(manualGroupingActive, groupRow),
		[manualGroupingActive, groupRow],
	)

	// Phase 3: TanStack Table holds the column state and the state of the row
	// transforms, and builds no row model. The grid filters, sorts, groups, and
	// pages its rows itself. The result also carries the pagination view that the
	// footer renders from. Without a client transform, `renderRows` is `rows`.
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
		hiddenSelected,
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
		sortManual,
		// Client grouping only. Manual grouping groups no rows and renders the
		// consumer's sequence instead.
		grouping: groupingMode.engineGrouping,
		expanded: groupExpanded,
		onExpandedChange: setGroupExpanded,
		manualGroupRow,
		// Grouping renders its own body and stands pagination down (`gated.pagination`
		// is `undefined` while grouping), so the grid does not page the groups.
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
		density: step,
		// The grid collects the filtered rows only for a grand total.
		grandTotal: grandTotalRow,
	})

	// Phase 4: what the table resolved, fed back to the cursor through its refs.
	const {
		roving,
		rowIndexMap,
		hasRows,
		showingError,
		hasRowsToActOn,
		hasData,
		hasSelectionColumn,
		selectionActions,
	} = useGridDataView<T>({
		refs: indexRefs,
		rows,
		renderRows,
		rowKeys,
		visibleColumns,
		columns,
		filters,
		globalFilter,
		loading,
		error,
		sort,
		selection,
		setSelection,
		paginated: pagination != null,
		cursorEnabled: cursor.cursorEnabled,
		cursorNewRow: cursor.newRow,
		reconcile: cursor.reconcile,
		virtualized: gated.virtualize,
		onRowClick,
		onCellClick,
		onRowDoubleClick,
		onCellDoubleClick,
		tableRef,
	})

	const { toggleRow, toggleAll, allSelected, someSelected } = selectionActions

	// Resolve the `exportable` prop into one action per configured export type,
	// each reading the selected rows when a selection is active, else the full
	// filtered + sorted set (all pages). The selected subset keeps the displayed
	// order. A selection that holds no row of that set exports every row. Both are
	// taken over the leaves, so a group header never exports. An `exportRows`
	// source overrides both, supplying the rows that the grid does not hold under
	// server pagination. Split by surface: the toolbar's "Export" dropdown and
	// both context menus each take the set their own switch opens.
	const exportActions = useGridExport<T>({
		exportable,
		columns: visibleColumns,
		rows: rowsForExport,
		exportRows,
	})

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

	// The direction of the grid, read from its wrapper. The dialogs portal out of
	// the grid, so each takes this direction (see `useGridDialogDirection`).
	const direction = useGridDialogDirection(
		wrapperRef,
		columnManagerOpen || rowManager.open || widthConfirmOpen,
	)

	// Column-group band badge menu: Clear color (when colored) + Manage columns.
	const columnGroupMenu = useGridColumnGroupMenu({
		groups: group.groups,
		setGroups: group.setGroups,
		enabled: group.hasGroups,
		chooseColumns,
		manageLabel: managerLabel,
	})

	// Column reorder rides @dnd-kit's horizontal sortable; the dnd context of the
	// drag and drop module wraps the whole table region (see `GridRegion`), and
	// the header reads `canReorder` to register each draggable cell against it.
	// `reorderHandle` picks the grip vs. whole-header drag affordance the
	// headers render.
	const { enabled: reorderEnabled, handle: reorderHandle } = resolveGridReorder(reorder)

	const { canReorder, sortable: columnSortable } = useGridReorder<T>({
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
			virtualized: gated.virtualize,
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

	// Phase 5: the layout, the row counts, and the render gates.
	const {
		revealed: showTable,
		colGroup,
		tableClassName,
		tableWidth,
		resizing,
		groupHeader,
		groupRowOffset,
		grandTotal,
		newRowPlace,
		ariaRowCount,
		dataRowCount,
		footerStats,
		semantics: { enabled: gridSemantics, rowOffset: pageRowOffset, selectAllLabel },
		rowHover,
		reorderActive,
		animateSortRows,
		manualGroupBody,
		manualGroupSort,
		groupByContext,
	} = useGridDataFrame<T>({
		rows,
		renderRows,
		rowKeys,
		visibleColumns,
		loading,
		showingError,
		hasRows,
		hasData,
		widthsSettled,
		resizable,
		resize,
		className,
		group,
		pinning,
		grandTotalRow,
		grandTotalRows,
		groupTotalRow,
		groups,
		groupByConfig,
		grouping,
		setGrouping,
		groupRow,
		manualExpanded,
		toggleGroup,
		grouped: groupingMode.active,
		manualGroupingActive,
		expansion: detail.body,
		cursorNewRow: cursor.newRow,
		pagination,
		virtualized: gated.virtualize,
		cursorEnabled: cursor.cursorEnabled,
		infiniteScroll,
		footer,
		selectedCount: selection.size,
		hiddenSelected,
		hover,
		onRowClick,
		onCellClick,
		onRowDoubleClick,
		cellDoubleClick,
		canReorder,
		rowReorderActive,
		sort,
		animateSort: sortConfig?.animate ?? false,
		reduceMotion,
	})

	// The truncating head and cells read the drag state of the settle store (see
	// `useGridResizing`), not this value, so a sort or a select-all, which churns
	// this value, does not render every visible truncating cell again.
	const context = useMemo(
		() => ({
			toggleAll,
			allSelected,
			someSelected,
			sort,
			toggleSort,
			pinColumn,
			stickyHeader,
		}),
		[toggleAll, allSelected, someSelected, sort, toggleSort, pinColumn, stickyHeader],
	)

	const needsScrollWrapper = stickyHeader || gated.virtualize

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
				rowIndexMap,
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
							estimateSize: estimateSize ?? rowHeight,
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
							hasSelection={selection.size > 0}
							selection={selection}
							setSelection={setSelection}
						/>

						<GridGroupByContext value={groupByContext}>
							<GridRegion
								reorderConfigured={reorderEnabled || rowReorderConfig != null}
								canReorder={reorderActive}
								columnSortable={columnSortable}
								rowReorderActive={rowReorderActive}
								rowSortable={rowReorder.sortable}
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
								fill={cursor.fill}
								rowGroupMenu={rowManager.rowGroupMenu}
								columnGroupMenu={columnGroupMenu}
								columnFilter={filters}
							>
								{tableRegion}
							</GridRegion>
						</GridGroupByContext>

						<GridFooterBar config={footer} stats={footerStats} />

						{pagination && (
							<GridPaginationFooter
								pagination={pagination}
								label={tableProps?.['aria-label']}
								labelledBy={tableProps?.['aria-labelledby']}
							/>
						)}
					</div>
				</GridSettleContext>
			</GridOverlayDensityContext>
		</GridContext>
	)
}

/**
 * The direction of the grid, for the dialogs that portal out of it. It reads
 * the wrapper each time a dialog opens, before it paints, and not on each
 * render, because a computed-style read can force a style pass. With no
 * dialog open, nothing reads it.
 *
 * @internal
 */
function useGridDialogDirection(
	wrapperRef: RefObject<HTMLElement | null>,
	open: boolean,
): 'ltr' | 'rtl' {
	const [direction, setDirection] = useState<'ltr' | 'rtl'>('ltr')

	useLayoutEffect(() => {
		const wrapper = wrapperRef.current

		if (!open || !wrapper) return

		setDirection(isRtl(wrapper) ? 'rtl' : 'ltr')
	}, [open, wrapperRef])

	return direction
}
