'use client'

import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import {
	type ComponentProps,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import type { TableElementProps } from '../../components/table'
import { Table } from '../../components/table'
import { cn, dataAttr } from '../../core'
import type { DensityLevel } from '../../providers/density/context'
import { k } from '../../recipes/kata/grid'
import { isDataColumn } from '../../utilities'
import { GridContext, type SortState } from './context'
import { GridBody } from './grid-body'
import { GridColumnManagerDialog } from './grid-column-manager-dialog'
import { DEFAULT_OVERSCAN, DEFAULT_ROW_HEIGHT, GRID_STATUS_DEBOUNCE_MS } from './grid-constants'
import { GridContextMenu } from './grid-context-menu'
import type { GridDataProps, GridExportConfig, GridVirtualize } from './grid-data-types'
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
import { GridToolbar } from './grid-toolbar'
import type { GridColumn, GridContextMenu as GridContextMenuConfig } from './types'
import { useGridColumns } from './use-grid-columns'
import {
	GridNavContext,
	type GridNavTableProps,
	type GridRowActivate,
	useGridNavigation,
} from './use-grid-navigation'
import { useGridNavigationColumns } from './use-grid-navigation-columns'
import { useGridReorder } from './use-grid-reorder'
import { useGridResizeHeight } from './use-grid-resize-height'
import { useGridSelectionActions, useGridSelectionState } from './use-grid-selection'
import { type GridColumnResize, type GridPaginationView, useGridTable } from './use-grid-table'

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
 * Applies the grid-level `sortable` default to data columns that don't declare
 * their own: an undefined {@link GridColumn.sortable} inherits `defaultSortable`,
 * while an explicit value (and every non-data column) is left untouched.
 *
 * @internal
 */
function resolveSortable<T>(columns: GridColumn<T>[], defaultSortable: boolean): GridColumn<T>[] {
	return columns.map((col) =>
		isDataColumn(col) && col.sortable === undefined ? { ...col, sortable: defaultSortable } : col,
	)
}

/**
 * Collapses the `virtualize` prop (boolean or options object) into a resolved
 * enabled flag and sizing.
 *
 * @internal
 */
function resolveVirtualization(virtualize: GridVirtualize | undefined): {
	enabled: boolean
	estimateSize: number
	overscan: number
} {
	const enabled = virtualize != null && virtualize !== false

	const opts = typeof virtualize === 'object' ? virtualize : null

	return {
		enabled,
		estimateSize: opts?.estimateSize ?? DEFAULT_ROW_HEIGHT,
		overscan: opts?.overscan ?? DEFAULT_OVERSCAN,
	}
}

/**
 * Collapses the `exportable` prop (boolean shorthand or {@link GridExportConfig})
 * into resolved export settings: whether export is on, whether to render the
 * toolbar button (never when export is off), and the label and download
 * filename shared by the button and the header menu's "Export to CSV" item. The
 * boolean `true` enables export with the context-menu item alone.
 *
 * @internal
 */
function resolveExport(exportable: boolean | GridExportConfig): {
	enabled: boolean
	toolbarButton: boolean
	label: ReactNode
	filename: string
} {
	const config = typeof exportable === 'object' ? exportable : { enabled: exportable }

	const enabled = config.enabled ?? true

	return {
		enabled,
		toolbarButton: enabled && (config.toolbarButton ?? false),
		label: config.label ?? 'Export to CSV',
		filename: config.filename ?? 'grid.csv',
	}
}

/**
 * Assembles the `<table>` element props: the caller's `tableProps`, `aria-busy`
 * while loading, and the role/index scheme. The role is `grid` when the table
 * carries a keyboard cursor (`navigable`, or a caller-supplied `role` — the
 * editable grid), `table` when the body is only a window onto a larger set
 * (`gridSemantics`: virtualization or pagination) with no cursor, and native
 * otherwise. A windowed body also carries the full row/column counts (valid on
 * both roles); per-cell indices come from head/row.
 *
 * @remarks `role="grid"` is withheld until a keyboard model backs it: a windowed
 * but non-navigable table stays `role="table"`, which still honors
 * `aria-rowcount`/`aria-colcount`, rather than promising cell navigation it
 * doesn't implement.
 * @internal
 */
function resolveTableProps(args: {
	tableProps: TableElementProps | undefined
	/** Cursor props (tab stop, `aria-activedescendant`, key/focus handlers) under `navigable`. */
	navTableProps: GridNavTableProps | undefined
	loading: boolean
	gridSemantics: boolean
	navigable: boolean
	ariaRowCount: number
	colCount: number
	/** The grid renders a selection column; advertise `aria-multiselectable` when it resolves to a true `role="grid"`. */
	multiSelectable: boolean
	/** Fixed-layout table width (px) when resizable, sized to the `<colgroup>`. */
	tableWidth: number | undefined
}): TableElementProps {
	const role =
		args.tableProps?.role ?? (args.navigable ? 'grid' : args.gridSemantics ? 'table' : undefined)

	return {
		...args.tableProps,
		...args.navTableProps,
		// The navigable table drops its own focus outline (the active-cell ring is the
		// indicator); merge it onto any caller className so it reaches the `<table>`.
		...(args.navigable ? { className: cn(args.tableProps?.className, k.nav.table) } : {}),
		...(args.loading ? { 'aria-busy': true } : {}),
		...(args.tableWidth != null
			? { style: { ...args.tableProps?.style, width: args.tableWidth } }
			: {}),
		...(role ? { role } : {}),
		// `aria-multiselectable` is a grid-only state; a windowed `role="table"` or a
		// native table conveys selection through each row's `aria-selected` alone.
		...(args.multiSelectable && role === 'grid' ? { 'aria-multiselectable': true } : {}),
		...(args.gridSemantics
			? { 'aria-rowcount': args.ariaRowCount, 'aria-colcount': args.colCount }
			: {}),
	}
}

/** Resolved grid-semantics for the rendered window: the role/index gate, the global row offset, and the select-all label. @internal */
type GridSemantics = { enabled: boolean; rowOffset: number; selectAllLabel: string }

/**
 * Derives grid semantics from the rendered-window mode. The body is a window
 * onto a larger set under virtualization (DOM windowing) or pagination (one page
 * of many): both need `role="grid"`, `aria-rowcount`, and a page-/window-aware
 * global row offset so assistive tech reports position in the full set. Under
 * pagination the select-all checkbox toggles only the current page, so its label
 * says so rather than overclaiming "all rows". A plain table conveys all this
 * natively and stays a table.
 *
 * @internal
 */
function resolveGridSemantics(
	virtualizeEnabled: boolean,
	pagination: GridPaginationView | null,
): GridSemantics {
	return {
		enabled: virtualizeEnabled || pagination != null,
		rowOffset: pagination ? pagination.pageIndex * pagination.pageSize : 0,
		selectAllLabel: pagination ? 'Select all rows on this page' : 'Select all rows',
	}
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
 * The polite live-region message for the grid: `Loading` while loading, then —
 * after a short debounce so a fast filter/search doesn't chatter — a settled
 * row-count summary. Assistive tech hears the load start, its result, and later
 * result-count changes from filtering, search, or paging.
 *
 * @internal
 */
function useGridStatusMessage(loading: boolean, rowCount: number): string {
	const [message, setMessage] = useState('')

	useEffect(() => {
		if (loading) {
			setMessage('Loading')

			return
		}

		const id = setTimeout(() => {
			setMessage(rowCount === 1 ? '1 row' : rowCount === 0 ? 'No results' : `${rowCount} rows`)
		}, GRID_STATUS_DEBOUNCE_MS)

		return () => clearTimeout(id)
	}, [loading, rowCount])

	return message
}

/**
 * Visually-hidden polite status backing the grid's `aria-busy`: a stable live
 * region announcing the load start and, on completion, the result count (see
 * {@link useGridStatusMessage}).
 *
 * @internal
 */
function GridBusyStatus({ loading, rowCount }: { loading: boolean; rowCount: number }) {
	const message = useGridStatusMessage(loading, rowCount)

	return (
		<span role="status" className="sr-only">
			{message}
		</span>
	)
}

/**
 * Whether the grid paints the shared {@link Table} `hover` wash: when the
 * consumer opts in with `hover`, or implicitly for a clickable grid
 * (`onRowClick`), whose rows then read as actionable — but never through a
 * column drag-resize (`resizing`), so the row under the pointer doesn't light
 * up mid-drag (matching the truncation tooltips' `!resizing` gate). Pulled out
 * of {@link GridData} so the boolean logic stays off its cognitive-complexity
 * budget.
 *
 * @internal
 */
function resolveHover<T>(
	hover: boolean | undefined,
	onRowClick: GridRowClick<T> | undefined,
	resizing: boolean,
): boolean {
	return (hover === true || onRowClick != null) && !resizing
}

/**
 * Fixed-layout pieces for a resizable grid: the `<colgroup>` of exact widths,
 * the `table-fixed` + trailing-padding class, the total table width — so a resize
 * touches only its own column — and `resizing`, whether a pointer drag-resize is
 * in flight (the wrapper flags it so other columns' grips stand down). Inert (no
 * colgroup, no width, not resizing) when the grid is not resizable. Split out of
 * {@link GridData} for its cognitive-complexity budget.
 *
 * @internal
 */
function resolveResizeLayout<T>(args: {
	resizable: boolean
	resize: GridColumnResize | null
	columns: GridColumn<T>[]
	density: DensityLevel | undefined
	/** Whether cells truncate; a non-truncating grid flushes the grip to the border (see `k.resize.flush`). */
	truncate: boolean
	className: string | undefined
}): {
	colGroup: ReactNode
	tableClassName: string
	tableWidth: number | undefined
	resizing: boolean
} {
	const { resize } = args

	if (!args.resizable || !resize) {
		return {
			colGroup: null,
			tableClassName: cn(args.className),
			tableWidth: undefined,
			resizing: false,
		}
	}

	return {
		colGroup: (
			<colgroup>
				{args.columns.map((col) => (
					<col key={col.id} style={{ width: resize.getSize(col.id) }} />
				))}
			</colgroup>
		),
		// A non-truncating grid (the editable surface) flushes the grip to the column
		// border rather than the absent truncation point; a truncating grid keeps the
		// handle's default centred grip.
		tableClassName: cn(
			k.resize.fixed,
			k.resize.metrics({ density: args.density }),
			!args.truncate && k.resize.flush,
			args.className,
		),
		tableWidth: resize.totalSize(),
		resizing: resize.isResizingAny(),
	}
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
	truncate = true,
	rowClassName,
	onRowClick,
	rowLabel,
	stickyHeader = false,
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

	// Read-only keyboard cursor (opt-in via `navigable`). Bounds and the active
	// row resolve from these refs at event/render time, so the cursor's callbacks
	// and the augmented columns stay stable across moves and the memoized rows hold.
	const rowsRef = useRef<T[]>([])

	const colCountRef = useRef(0)

	const rowIndexMapRef = useRef<Map<T, number>>(new Map())

	const colIndexMapRef = useRef<Map<string | number, number>>(new Map())

	// A stable click handler so the memoized rows don't churn when the consumer
	// passes an inline `onRowClick`; the cursor also activates its row on Enter/Space.
	const handleRowClick = useStableRowClick(onRowClick)

	// Bridge the row-click into the cursor's Enter/Space activation (see `bridgeRowActivate`).
	const onRowActivate = useMemo(() => bridgeRowActivate(handleRowClick), [handleRowClick])

	const nav = useGridNavigation({ enabled: navigable, rowsRef, colCountRef, onRowActivate })

	// Augment the data columns with the cursor wiring (cell ids, `role="gridcell"`,
	// click-to-focus, active marker) before the engine builds its column defs. A
	// non-navigable grid gets `pinnedColumns` back untouched.
	const navColumns = useGridNavigationColumns<T>({
		enabled: navigable,
		columns: pinnedColumns,
		rowIndexMapRef,
		colIndexMapRef,
		cellId: nav.cellId,
		moveTo: nav.moveTo,
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
		// Under `navigable` these carry the cursor wiring (see `navColumns`).
		columns: navColumns,
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
	})

	// Publish the table height so each column's resize handle spans the full
	// column (header through the last row), not just its header cell.
	useGridResizeHeight(wrapperRef, resizable)

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
	// `resizing` flags an in-flight drag so other columns' grips stand down (and
	// head/cells suppress their truncation tooltips, shared below via context).
	const { colGroup, tableClassName, tableWidth, resizing } = resolveResizeLayout({
		resizable,
		resize,
		columns: visibleColumns,
		density,
		truncate,
		className,
	})

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

	// Full row extent for grid semantics: the server total when paginating, else
	// the rendered count (which equals every row when unpaginated).
	const ariaRowCount = (pagination?.rowCount ?? renderRows.length) + 1

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

	// The cursor store is always provided (inert when not `navigable`); only a
	// navigable grid's cells subscribe, so the wrapper costs nothing otherwise.
	const tableContent = (
		<GridNavContext value={nav.store}>
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
					navTableProps: nav.navTableProps,
					loading,
					gridSemantics,
					navigable,
					ariaRowCount,
					colCount: visibleColumns.length,
					multiSelectable: hasSelectionColumn,
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
					pinning={pinning}
					virtualize={virtualizeEnabled ? { scrollRef, estimateSize, overscan } : null}
				/>
			</Table>
		</GridNavContext>
	)

	const tableRegion = needsScrollWrapper ? (
		<div
			ref={scrollRef}
			className={cn(k.sticky.wrapper)}
			style={maxHeight ? { maxHeight } : undefined}
		>
			{tableContent}
		</div>
	) : (
		tableContent
	)

	return (
		<GridContext value={context}>
			<div
				ref={wrapperRef}
				data-slot="grid"
				// Flags an in-flight column drag-resize so the headers stand down their
				// hover grips (only the active column stays lit) and the grid paints the
				// resize cursor; see `k.resize.host` and `k.wrapper`.
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
