'use client'

import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import {
	type ComponentProps,
	type ReactNode,
	useCallback,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { Table } from '../../components/table'
import { cn, dataAttr } from '../../core'
import { useA11yAnnouncements } from '../../hooks'
import { k } from '../../recipes/kata/grid'
import { isDataColumn } from '../../utilities'
import { GridContext, type SortState } from './context'
import { GridBody } from './grid-body'
import { GridColumnManagerDialog } from './grid-column-manager-dialog'
import { GridContextMenu } from './grid-context-menu'
import {
	resolveAriaRowCount,
	resolveExport,
	resolveGridSemantics,
	resolveHover,
	resolveResizeLayout,
	resolveSortable,
	resolveTableProps,
	resolveVirtualization,
} from './grid-data-resolvers'
import type { GridDataProps } from './grid-data-types'
import { downloadCsv, rowsToCsv } from './grid-export'
import { GridHead } from './grid-head'
import { useGridMenuActions } from './grid-menu-actions'
import { GridPagination as GridPaginationFooter } from './grid-pagination'
import { applyPinOverrides, type PinOverrides, type PinSide } from './grid-pin-overrides'
import {
	GridReorderContext,
	restrictToFirstScrollableAncestor,
	restrictToHorizontalAxis,
} from './grid-reorder'
import type { GridRowClick } from './grid-row'
import { useGridSort } from './grid-sort-state'
import { describeSelection, describeSort, GridBusyStatus } from './grid-status'
import { useColumnSettleWidths } from './grid-table-views'
import { GridToolbar } from './grid-toolbar'
import type { GridScrollRowIntoView } from './grid-virtualized-body'
import type { GridColumn, GridContextMenu as GridContextMenuConfig } from './types'
import { useGridColumns } from './use-grid-columns'
import { useGridCursor } from './use-grid-cursor'
import { GridNavContext, type GridRowActivate } from './use-grid-navigation'
import { useGridReorder } from './use-grid-reorder'
import { useGridSelectionActions, useGridSelectionState } from './use-grid-selection'
import { useGridTable } from './use-grid-table'

/**
 * Locks column drags to the x-axis and bounds them to the scroll container, so
 * horizontal auto-scroll can reach off-screen columns without running away. @internal
 */
const REORDER_MODIFIERS = [restrictToHorizontalAxis, restrictToFirstScrollableAncestor]

/**
 * Column-drag auto-scroll: horizontal only — a wide table scrolls sideways to
 * reach off-screen columns (bounded by the scroll-ancestor modifier above) —
 * with the vertical axis off so a downward drag can't scroll the body. @internal
 */
const REORDER_AUTO_SCROLL = { threshold: { x: 0.2, y: 0 } }

/** Props for {@link GridRegion}. @internal */
type GridRegionProps<T> = {
	canReorder: boolean
	dndContextProps: ComponentProps<typeof DndContext>
	itemIds: ComponentProps<typeof SortableContext>['items']
	strategy: ComponentProps<typeof SortableContext>['strategy']
	/** Id of the column being dragged, or `null`; handed to the reordering body cells for their lift cue. */
	activeReorderId: string | null
	contextMenu: GridContextMenuConfig<T> | undefined
	columns: GridColumn<T>[]
	rows: T[]
	rowKeys: (string | number)[]
	/** Active sort columns in priority order, so the header menu can offer "Clear sort" for a sorted column. */
	sort: SortState[]
	sortColumn: (column: string | number, direction: 'asc' | 'desc') => void
	clearSort: () => void
	/** Pins a column to an edge, or unpins it with `false`; backs the header menu's Pin items. */
	pinColumn: (column: string | number, side: PinSide | false) => void
	autoSizeColumns: (() => void) | null
	chooseColumns: (() => void) | null
	exportCsv: (() => void) | null
	/** Label on the header menu's "Export to CSV" item, shared with the export toolbar button. */
	exportLabel: ReactNode
	children: ReactNode
}

/**
 * Wraps the table region in its interaction layers: the column-reorder dnd
 * context (when reorderable) nested inside the right-click context menu (when
 * configured). Split out of {@link GridData} so its body stays within the
 * cognitive-complexity budget.
 *
 * @internal
 */
function GridRegion<T>({
	canReorder,
	dndContextProps,
	itemIds,
	strategy,
	activeReorderId,
	contextMenu,
	columns,
	rows,
	rowKeys,
	sort,
	sortColumn,
	clearSort,
	pinColumn,
	autoSizeColumns,
	chooseColumns,
	exportCsv,
	exportLabel,
	children,
}: GridRegionProps<T>) {
	const reordered = canReorder ? (
		<DndContext {...dndContextProps} modifiers={REORDER_MODIFIERS} autoScroll={REORDER_AUTO_SCROLL}>
			<SortableContext items={itemIds} strategy={strategy}>
				<GridReorderContext value={activeReorderId}>{children}</GridReorderContext>
			</SortableContext>
		</DndContext>
	) : (
		children
	)

	if (!contextMenu) return reordered

	return (
		<GridContextMenu
			config={contextMenu}
			columns={columns}
			rows={rows}
			rowKeys={rowKeys}
			sort={sort}
			sortColumn={sortColumn}
			clearSort={clearSort}
			pinColumn={pinColumn}
			autoSizeColumns={autoSizeColumns}
			chooseColumns={chooseColumns}
			exportCsv={exportCsv}
			exportLabel={exportLabel}
		>
			{reordered}
		</GridContextMenu>
	)
}

/**
 * Stabilizes an `onRowClick` callback so the memoized rows hold across renders:
 * returns a referentially-stable handler (or `undefined` when no callback is
 * set) that reads the live callback through a ref, so an inline consumer
 * callback doesn't churn every row.
 *
 * @internal
 */
function useStableRowClick<T>(
	onRowClick: GridRowClick<T> | undefined,
): GridRowClick<T> | undefined {
	const ref = useRef(onRowClick)

	ref.current = onRowClick

	const hasRowClick = onRowClick != null

	return useMemo(
		() => (hasRowClick ? (row: T, event) => ref.current?.(row, event) : undefined),
		[hasRowClick],
	)
}

/**
 * Adapts the row-click into the cursor's `onRowActivate`: the cursor fires from
 * the grid `<table>` (its single tab stop), so the row-level event type is bridged
 * to the table-level one here. `undefined` when the grid has no row click.
 *
 * @internal
 */
function bridgeRowActivate<T>(
	handleRowClick: GridRowClick<T> | undefined,
): GridRowActivate | undefined {
	if (!handleRowClick) return undefined

	return (row, event) =>
		handleRowClick(row as T, event as unknown as Parameters<GridRowClick<T>>[1])
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
	sortable = true,
	selection: selectionConfig,
	columnOrder: columnOrderConfig,
	columnManager: columnManagerConfig,
	pagination: paginationConfig,
	resizable = true,
	columnSizing: columnSizingConfig,
	search: searchConfig,
	columnFilters: columnFiltersConfig,
	contextMenu,
	exportable = false,
	reorder = false,
	navigable = false,
	editable,
	truncate = true,
	rowClassName,
	onRowClick,
	rowLabel,
	header,
	maxHeight,
	loading = false,
	rowLoading,
	empty,
	error,
	virtualize,
	tableProps,
	density,
	bleed,
	outline,
	striped,
	hover,
	className,
}: GridDataProps<T>) {
	if (virtualize && !maxHeight) {
		throw new Error(
			'<Grid virtualize> requires `maxHeight` — virtualization needs a scroll container of known size.',
		)
	}

	const { enabled: virtualizeEnabled, estimateSize, overscan } = resolveVirtualization(virtualize)

	// Sticky header pins the header row while the body scrolls (forcing a scroll
	// wrapper); resolved from the `header` config's `position`.
	const stickyHeader = header?.position === 'sticky'

	// Columns sort by default; bake the grid-level default into each data column
	// that doesn't set its own, so head and engine read one resolved flag.
	const resolvedColumns = useMemo(() => resolveSortable(columns, sortable), [columns, sortable])

	// Menu-applied pin changes, layered over the static `pinned` flags. Folding
	// them into the columns here lets the column and engine hooks read one
	// `pinned` flag whether it came from the definition or the menu.
	const [pinOverrides, setPinOverrides] = useState<PinOverrides>(() => new Map())

	const pinnedColumns = useMemo(
		() => applyPinOverrides(resolvedColumns, pinOverrides),
		[resolvedColumns, pinOverrides],
	)

	const pinColumn = useCallback((id: string | number, side: PinSide | false) => {
		setPinOverrides((prev) => {
			const next = new Map(prev)

			next.set(id, side === false ? 'none' : side)

			return next
		})
	}, [])

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

	// A stable click handler so the memoized rows don't churn when the consumer
	// passes an inline `onRowClick`; the cursor also activates its row on Enter.
	const handleRowClick = useStableRowClick(onRowClick)

	// Bridge the row-click into the cursor's Enter/Space activation (see `bridgeRowActivate`).
	const onRowActivate = useMemo(() => bridgeRowActivate(handleRowClick), [handleRowClick])

	// The cursor + editing layer: the augmented columns, the `<table>` cursor
	// props, the cursor store, and the row-editing-context wrapper. Inert for a
	// static grid.
	const cursor = useGridCursor<T>({
		navigable,
		editable,
		columns: pinnedColumns,
		onRowActivate,
		selectableRef,
		toggleActiveRow,
		scrollRowIntoViewRef,
		refs: {
			rowsRef,
			colCountRef,
			rowIndexMapRef,
			colIndexMapRef,
			rowKeysRef,
			dataColumnsRef,
		},
	})

	const { sort, setSort, toggleSort } = useGridSort(sortConfig)

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
	} = useGridColumns<T>({ columns: pinnedColumns, columnOrderConfig, columnManagerConfig })

	// TanStack Table is the data engine: rows flow through its row model, which
	// also surfaces the pagination state and handlers the footer renders from.
	// When `pagination` is unset the model is bypassed and `renderRows === rows`.
	// Measured to auto-size resizable columns to fill the available width.
	const wrapperRef = useRef<HTMLDivElement>(null)

	const {
		table,
		visibleColumns,
		renderRows,
		rowKeys,
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
		sortManual: sortConfig?.manual ?? false,
		pagination: paginationConfig,
		resizable,
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
	useLayoutEffect(() => {
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

	// Resolve the `exportable` prop (boolean shorthand or config) into the enabled
	// flag, the opt-in toolbar button, and the label/filename shared by the button
	// and the header menu's "Export to CSV" item.
	const {
		enabled: exportEnabled,
		toolbarButton: exportToolbarButton,
		label: exportLabel,
		filename: exportFilename,
	} = resolveExport(exportable)

	// Export to a CSV download: the selected rows when a selection is active, else
	// the full filtered + sorted set (all pages). The engine's sorted row model
	// reflects active filters and sort and carries each row's selected state (the
	// grid mirrors its selection `Set` into the engine), so the selected subset
	// keeps the displayed order; `null` keeps the menu items and the toolbar
	// button out unless export is enabled.
	const exportCsv = useMemo(
		() =>
			exportEnabled
				? () => {
						const sorted = table.getSortedRowModel().rows

						const selected = sorted.filter((modelRow) => modelRow.getIsSelected())

						const exported = selected.length > 0 ? selected : sorted

						downloadCsv(
							exportFilename,
							rowsToCsv(
								visibleColumns,
								exported.map((modelRow) => modelRow.original),
							),
						)
					}
				: null,
		[exportEnabled, exportFilename, visibleColumns, table],
	)

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

	// Per-visible-column width snapshot threaded to the body cells' truncation
	// detector so a settled resize (or keyboard nudge) re-renders just that
	// column's cells to re-measure overflow; frozen during a drag so the memoized
	// cells hold frame-to-frame (see `useColumnSettleWidths`).
	const settleWidths = useColumnSettleWidths(visibleColumns, resize, resizing)

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
		renderDialog,
		showButton,
		managerLabel,
		columnManagerOpen,
		setColumnManagerOpen,
		sortColumn,
		clearSort,
		autoSizeColumns,
		chooseColumns,
	} = useGridMenuActions<T>({
		contextMenu,
		columnManagerConfig,
		resize,
		setSort,
		hasData,
	})

	// Column reorder rides @dnd-kit's horizontal sortable; the dnd context wraps
	// the whole table region (see `useGridReorder`), and the header reads
	// `canReorder` to register each draggable cell against it.
	const { canReorder, itemIds, strategy, dndContextProps, activeId } = useGridReorder<T>({
		reorder,
		visibleColumns,
		reorderColumns,
	})

	const scrollRef = useRef<HTMLDivElement>(null)

	const needsScrollWrapper = stickyHeader || virtualizeEnabled

	const ariaRowCount = resolveAriaRowCount(pagination, renderRows.length)

	// Full filtered row extent (the server total when paginating) for the busy
	// region's result announcement; the header row the aria count adds is excluded.
	const dataRowCount = pagination?.rowCount ?? renderRows.length

	// Grid semantics (role="grid" + global indices) and the select-all label,
	// derived together from the rendered-window mode; see `resolveGridSemantics`.
	const {
		enabled: gridSemantics,
		rowOffset: pageRowOffset,
		selectAllLabel,
	} = resolveGridSemantics(virtualizeEnabled, pagination)

	// A clickable grid reads as actionable through the shared `<Table hover>`
	// wash, layered over any explicit `hover`; the row keeps its own pointer
	// cursor (see `GridRow`). Suppressed through a column drag-resize so the row
	// under the pointer doesn't light up mid-drag.
	const rowHover = resolveHover(hover, onRowClick, resizing)

	const reorderActive = canReorder && hasData

	// The cursor store is always provided (inert when not navigable/editable); only
	// a cursor grid's cells subscribe, so the wrapper costs nothing otherwise.
	const tableContent = (
		<GridNavContext value={cursor.navStore}>
			<Table
				density={density}
				bleed={bleed}
				outline={outline}
				striped={striped}
				hover={rowHover}
				className={tableClassName}
				tableProps={resolveTableProps({
					tableProps,
					// The cursor's tab stop, active-cell pointer, and key/focus handlers.
					navTableProps: cursor.navTableProps,
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
					resize={resize}
					filters={filters}
					pinning={pinning}
				/>

				<GridBody<T>
					loading={loading}
					table={table}
					rows={renderRows}
					rowKeys={rowKeys}
					visibleColumns={visibleColumns}
					rowLoading={rowLoading}
					rowClassName={rowClassName}
					rowLabel={rowLabel}
					onRowClick={handleRowClick}
					empty={empty}
					error={error}
					gridSemantics={gridSemantics}
					rowIndexOffset={pageRowOffset}
					selection={selection}
					toggleRow={toggleRow}
					selectable={hasSelectionColumn}
					reorderable={reorderActive}
					truncate={truncate}
					settleWidths={settleWidths}
					pinning={pinning}
					virtualize={
						virtualizeEnabled
							? { scrollRef, estimateSize, overscan, scrollIntoViewRef: scrollRowIntoViewRef }
							: null
					}
				/>
			</Table>
		</GridNavContext>
	)

	// Mount the editing contexts (the open edit's coord and session) around the
	// table when editable; a read-only grid returns it untouched.
	const cursorContent = cursor.wrap(tableContent)

	const tableRegion = needsScrollWrapper ? (
		<div
			ref={scrollRef}
			className={cn(k.sticky.wrapper)}
			style={maxHeight ? { maxHeight } : undefined}
		>
			{cursorContent}
		</div>
	) : (
		cursorContent
	)

	return (
		<GridContext value={context}>
			<div
				ref={wrapperRef}
				data-slot="grid"
				// Flags an in-flight column drag-resize so the grid paints the resize
				// cursor grid-wide (see `k.wrapper`); head and cells read the matching
				// `resizing` context flag to drop their hover wash and truncation tooltips.
				data-resizing={dataAttr(resizing)}
				className={cn(k.wrapper)}
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
						hidden={hiddenColumns}
						onHiddenChange={setHiddenColumns}
						onSavePreset={columnManagerConfig?.onSavePreset}
					/>
				)}

				<GridToolbar
					filter={globalFilter}
					showColumnManager={showButton}
					columnManagerLabel={managerLabel}
					onManageColumns={() => setColumnManagerOpen(true)}
					showExport={exportToolbarButton}
					exportLabel={exportLabel}
					onExport={exportCsv}
					batchActions={batchActions}
					hasSelection={someSelected}
					selection={selection}
					setSelection={setSelection}
				/>

				<GridRegion
					canReorder={reorderActive}
					dndContextProps={dndContextProps}
					itemIds={itemIds}
					strategy={strategy}
					activeReorderId={activeId}
					contextMenu={resolvedContextMenu}
					columns={visibleColumns}
					rows={renderRows}
					rowKeys={rowKeys}
					sort={sort}
					sortColumn={sortColumn}
					clearSort={clearSort}
					pinColumn={pinColumn}
					autoSizeColumns={autoSizeColumns}
					chooseColumns={chooseColumns}
					exportCsv={exportCsv}
					exportLabel={exportLabel}
				>
					{tableRegion}
				</GridRegion>

				{pagination && <GridPaginationFooter pagination={pagination} />}
			</div>
		</GridContext>
	)
}
