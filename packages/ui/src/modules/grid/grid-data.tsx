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
import { Toolbar } from '../../components/toolbar'
import { cn, dataAttr } from '../../core'
import { useControllable } from '../../hooks'
import type { DensityLevel } from '../../providers/density/context'
import { k } from '../../recipes/kata/grid'
import { isDataColumn } from '../../utilities'
import { GridContext, type SortState } from './context'
import { GridBody } from './grid-body'
import { GridColumnManagerDialog } from './grid-column-manager-dialog'
import { DEFAULT_OVERSCAN, DEFAULT_ROW_HEIGHT, GRID_STATUS_DEBOUNCE_MS } from './grid-constants'
import { GridContextMenu } from './grid-context-menu'
import type {
	GridColumnManagerConfig,
	GridDataProps,
	GridSort,
	GridVirtualize,
} from './grid-data-types'
import { downloadCsv, rowsToCsv } from './grid-export'
import { GridFilter } from './grid-filter'
import { GridHead } from './grid-head'
import { GridPagination as GridPaginationFooter } from './grid-pagination'
import { restrictToFirstScrollableAncestor, restrictToHorizontalAxis } from './grid-reorder'
import type { GridRowClick } from './grid-row'
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

/** Context menus are on by default (both header and cell); `contextMenu={false}` disables them. @internal */
const DEFAULT_CONTEXT_MENU = { column: true, cell: true } as const

/** Props for {@link GridRegion}. @internal */
type GridRegionProps<T> = {
	canReorder: boolean
	dndContextProps: ComponentProps<typeof DndContext>
	itemIds: ComponentProps<typeof SortableContext>['items']
	strategy: ComponentProps<typeof SortableContext>['strategy']
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
	children,
}: GridRegionProps<T>) {
	const reordered = canReorder ? (
		<DndContext {...dndContextProps} modifiers={REORDER_MODIFIERS} autoScroll={REORDER_AUTO_SCROLL}>
			<SortableContext items={itemIds} strategy={strategy}>
				{children}
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
		>
			{reordered}
		</GridContextMenu>
	)
}

/** A column's frozen edge once normalized (`true` collapses to `'left'`). @internal */
type PinSide = 'left' | 'right'

/**
 * Runtime pin changes keyed by column id, layered over the static
 * {@link GridColumn.pinned} flags: a side pins the column, `'none'` unpins a
 * statically-pinned one. The header menu writes here so a column can be frozen
 * or released without touching the column definitions.
 *
 * @internal
 */
type PinOverrides = Map<string | number, PinSide | 'none'>

/**
 * Overlays the menu's {@link PinOverrides} onto each column's static `pinned`
 * flag, cloning only the columns an override touches — and returning the input
 * array untouched when there are none — so unrelated columns keep their identity
 * (and the downstream `visibleColumns` reference reuse holds).
 *
 * @internal
 */
function applyPinOverrides<T>(columns: GridColumn<T>[], overrides: PinOverrides): GridColumn<T>[] {
	if (overrides.size === 0) return columns

	return columns.map((col) => {
		const override = overrides.get(col.id)

		if (override === undefined) return col

		return { ...col, pinned: override === 'none' ? undefined : override }
	})
}

/** Stable empty sort default; the unsorted state, read-only and replaced wholesale. @internal */
const EMPTY_SORT: SortState[] = []

/**
 * Next sort list after cycling `column`. A Shift-click (`additive`) folds the
 * column into the existing sort, preserving the others and their priority order:
 * appending it ascending, flipping it to descending, then dropping it. A plain
 * click collapses the sort to this column alone, cycling ascending → descending →
 * unsorted (so a lone sorted column clears on its third click).
 *
 * @internal
 */
function nextSort(current: SortState[], column: string | number, additive: boolean): SortState[] {
	const existing = current.find((entry) => entry.column === column)

	if (additive) {
		if (!existing) return [...current, { column, direction: 'asc' }]

		if (existing.direction === 'asc') {
			return current.map((entry) =>
				entry.column === column ? { column, direction: 'desc' } : entry,
			)
		}

		return current.filter((entry) => entry.column !== column)
	}

	// Tri-state only when this column is already the sole sort; otherwise a plain
	// click on any other (or additional) column resets to just this one, ascending.
	if (current.length === 1 && existing) {
		return existing.direction === 'asc' ? [{ column, direction: 'desc' }] : EMPTY_SORT
	}

	return [{ column, direction: 'asc' }]
}

/**
 * Owns the grid's controllable sort: the resolved ordered list (never
 * `undefined` — an empty list is unsorted), the raw setter the engine and header
 * menu write through, and `toggleSort`, which cycles a column's sort via
 * {@link nextSort} (Shift-click folds it into the existing sort).
 *
 * @internal
 */
function useGridSort(config: GridSort | undefined): {
	sort: SortState[]
	setSort: (sort: SortState[]) => void
	toggleSort: (column: string | number, additive: boolean) => void
} {
	const [sortState, setSortState] = useControllable<SortState[]>({
		value: config?.value,
		defaultValue: config?.defaultValue ?? EMPTY_SORT,
		// The list is never meaningfully `undefined`; coalesce so the public callback
		// keeps its non-nullable shape (an empty list is the unsorted state).
		onValueChange: (next) => config?.onValueChange?.(next ?? EMPTY_SORT),
	})

	const toggleSort = useCallback(
		(column: string | number, additive: boolean) =>
			setSortState((prev) => nextSort(prev ?? EMPTY_SORT, column, additive)),
		[setSortState],
	)

	return { sort: sortState ?? EMPTY_SORT, setSort: setSortState, toggleSort }
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
 * (`onRowClick`), whose rows then read as actionable. Pulled out of
 * {@link GridData} so the `||` stays off its cognitive-complexity budget.
 *
 * @internal
 */
function resolveHover<T>(
	hover: boolean | undefined,
	onRowClick: GridRowClick<T> | undefined,
): boolean {
	return hover === true || onRowClick != null
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
		tableClassName: cn(k.resize.fixed, k.resize.padding({ density: args.density }), args.className),
		tableWidth: resize.totalSize(),
		resizing: resize.isResizingAny(),
	}
}

/**
 * Resolves the column-manager gates, lifts the dialog's open state, and derives
 * the header context-menu actions (sort a column, open the manager). Column
 * management is on by default ({@link GridColumnManagerConfig.enabled}); the
 * standalone toolbar button is opt-in
 * ({@link GridColumnManagerConfig.toolbarButton}). Split out of {@link GridData}
 * so its body stays within the cognitive-complexity budget.
 *
 * @internal
 */
function useGridMenuActions<T>({
	contextMenu,
	columnManagerConfig,
	resize,
	setSort,
	hasData,
}: {
	contextMenu: GridContextMenuConfig<T> | false | undefined
	columnManagerConfig: GridColumnManagerConfig | undefined
	resize: GridColumnResize | null
	setSort: (sort: SortState[]) => void
	/** Right-click menus stand down with no source data (its items act on rows). */
	hasData: boolean
}) {
	// Context menus are on by default (`false` opts out), but never without data.
	const configured = contextMenu === false ? undefined : (contextMenu ?? DEFAULT_CONTEXT_MENU)

	const menu = hasData ? configured : undefined

	// Column management is on by default; `enabled: false` is the master off
	// switch — no "Manage columns" item, no toolbar button, no dialog.
	const managerEnabled = columnManagerConfig?.enabled ?? true

	const managerLabel = columnManagerConfig?.label ?? 'Manage columns'

	// Two entry points to the dialog, both under the master switch: the opt-in
	// toolbar button, and the header menu's "Manage columns" item (shown whenever
	// a column menu is). The dialog mounts when either can reach it.
	const showButton = managerEnabled && (columnManagerConfig?.toolbarButton ?? false)

	const menuItemReachable = managerEnabled && Boolean(menu?.column)

	const renderDialog = showButton || menuItemReachable

	const [open, setOpen] = useControllable<boolean>({
		value: columnManagerConfig?.open,
		defaultValue: columnManagerConfig?.defaultOpen ?? false,
		onValueChange: (next) => columnManagerConfig?.onOpenChange?.(next ?? false),
	})

	// The menu sets a single-column sort, replacing any multi-column sort; Clear
	// sort empties it. (Multi-column sorting is the header Shift-click path.)
	const sortColumn = useCallback(
		(column: string | number, direction: 'asc' | 'desc') => setSort([{ column, direction }]),
		[setSort],
	)

	const clearSort = useCallback(() => setSort([]), [setSort])

	// Backs the menu's "Manage columns" item; `null` keeps it out. Non-null
	// implies `renderDialog`, so opening is always valid (the item only ever
	// renders inside a column menu, which the master switch already gated).
	const chooseColumns = useMemo(
		() => (renderDialog ? () => setOpen(true) : null),
		[renderDialog, setOpen],
	)

	return {
		contextMenu: menu,
		renderDialog,
		showButton,
		managerLabel,
		columnManagerOpen: open ?? false,
		setColumnManagerOpen: setOpen,
		sortColumn,
		clearSort,
		// Header "Auto-size columns" — only when resizing is on.
		autoSizeColumns: resize?.sizeToFit ?? null,
		chooseColumns,
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

	const { table, visibleColumns, renderRows, pagination, resize, globalFilter, filters, pinning } =
		useGridTable<T>({
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

	const rowKeys = useMemo<(string | number)[]>(
		() => renderRows.map((row, i) => getKey(row, i)),
		[renderRows, getKey],
	)

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

	// Column interactions stand down only when there's no *source* data to act on
	// (incl. while loading) — not when a filter or search empties the view, where
	// the header must stay live so the user can clear it and recover the rows.
	const hasData = rows.length > 0

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

	// Export the filtered + sorted rows (all pages) to a CSV download. The engine's
	// sorted row model reflects active filters and sort; `null` keeps the menu item
	// out unless `exportable` is set.
	const exportCsv = useMemo(
		() =>
			exportable
				? () =>
						downloadCsv(
							'grid.csv',
							rowsToCsv(
								visibleColumns,
								table.getSortedRowModel().rows.map((modelRow) => modelRow.original),
							),
						)
				: null,
		[exportable, visibleColumns, table],
	)

	const context = useMemo(
		() => ({
			selection,
			toggleRow,
			toggleAll,
			allSelected,
			someSelected,
			sort,
			toggleSort,
			pinColumn,
			stickyHeader,
		}),
		[
			selection,
			toggleRow,
			toggleAll,
			allSelected,
			someSelected,
			sort,
			toggleSort,
			pinColumn,
			stickyHeader,
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
	const { canReorder, itemIds, strategy, dndContextProps } = useGridReorder<T>({
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
	// cursor (see `GridRow`).
	const rowHover = resolveHover(hover, onRowClick)

	const reorderActive = canReorder && hasData

	// Fixed-layout column widths so a resize touches only its own column;
	// `resizing` flags an in-flight drag so other columns' grips stand down.
	const { colGroup, tableClassName, tableWidth, resizing } = resolveResizeLayout({
		resizable,
		resize,
		columns: visibleColumns,
		density,
		className,
	})

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
						toolbarButton={showButton}
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

				{globalFilter && <GridFilter filter={globalFilter} />}

				{batchActions && someSelected && (
					<Toolbar aria-label="Batch actions">{batchActions({ selection, setSelection })}</Toolbar>
				)}

				<GridRegion
					canReorder={reorderActive}
					dndContextProps={dndContextProps}
					itemIds={itemIds}
					strategy={strategy}
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
				>
					{tableRegion}
				</GridRegion>

				{pagination && <GridPaginationFooter pagination={pagination} />}
			</div>
		</GridContext>
	)
}
