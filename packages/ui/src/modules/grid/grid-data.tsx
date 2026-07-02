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
import { announce, cn, dataAttr } from '../../core'
import { useA11yAnnouncements } from '../../hooks'
import { Density } from '../../primitives/density'
import { type DensityLevel, densityToSize, useDensityLevel } from '../../providers/density'
import { k } from '../../recipes/kata/grid'
import { isDataColumn } from '../../utilities'
import { GridContext, GridResizingContext, type SortState } from './context'
import type { GridExportAction } from './export/types'
import {
	describeColumnVisibility,
	describePin,
	describeSelection,
	describeSort,
} from './grid-announcements'
import { GridBody } from './grid-body'
import { GridBusyStatus } from './grid-busy-status'
import { GridColumnManagerDialog } from './grid-column-manager-dialog'
import { GridContextMenu } from './grid-context-menu'
import {
	resolveAriaRowCount,
	resolveFooterStats,
	resolveGridSemantics,
	resolveHover,
	resolveResizeLayout,
	resolveSortable,
	resolveTableProps,
	resolveVirtualization,
} from './grid-data-resolvers'
import type { GridDataProps } from './grid-data-types'
import { GridFooter as GridFooterBar } from './grid-footer'
import { GridHead } from './grid-head'
import { useGridMenuActions } from './grid-menu-actions'
import { GridPagination as GridPaginationFooter } from './grid-pagination'
import { applyPinOverrides, type PinOverrides, type PinSide } from './grid-pin-overrides'
import {
	GridReorderContext,
	restrictToFirstScrollableAncestor,
	restrictToHorizontalAxis,
	restrictToVerticalAxis,
} from './grid-reorder'
import type { GridRowClick } from './grid-row'
import { useGridSort } from './grid-sort-state'
import { useColumnSettleWidths } from './grid-table-views'
import { GridToolbar } from './grid-toolbar'
import type { GridScrollRowIntoView } from './grid-virtualized-body'
import {
	columnLabel,
	type GridColumn,
	type GridContextMenu as GridContextMenuConfig,
	type GridPagination,
} from './types'
import { useGridColumns } from './use-grid-columns'
import { useGridCursor } from './use-grid-cursor'
import { useGridExport } from './use-grid-export'
import { type GridGroupHeader, type GridGroupResult, useGridGroup } from './use-grid-group'
import { GridNavContext, type GridRowActivate } from './use-grid-navigation'
import { useGridReorder } from './use-grid-reorder'
import { useGridRowGrouping } from './use-grid-row-grouping'
import { useGridRowReorder } from './use-grid-row-reorder'
import { useGridSelectionActions, useGridSelectionState } from './use-grid-selection'
import { type GridColumnPinning, useGridTable } from './use-grid-table'

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

/** Locks a row drag to the y-axis and bounds it to the scroll container. @internal */
const ROW_REORDER_MODIFIERS = [restrictToVerticalAxis, restrictToFirstScrollableAncestor]

/**
 * Row-drag auto-scroll: vertical only — a tall grid scrolls up/down to reach
 * off-screen rows (bounded by the scroll-ancestor modifier) — with the
 * horizontal axis off so a sideways nudge can't scroll the columns. @internal
 */
const ROW_REORDER_AUTO_SCROLL = { threshold: { x: 0, y: 0.2 } }

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

/** Whether `id` names a groupable column — a present data column (not selection / actions / drag-handle). @internal */
function isGroupableColumnId<T>(columns: GridColumn<T>[], id: string | number): boolean {
	return columns.some((col) => col.id === id && isDataColumn(col))
}

/**
 * Zeroes the grid features that grouping renders its own body over: while
 * grouping is active it stands the navigable cursor, virtualization, and
 * pagination down (the grouped body is a plain, whole-set table), so those flags
 * resolve to `false`/`undefined`; otherwise each passes through. Split out so
 * {@link GridData} stays within its complexity budget.
 *
 * @internal
 */
function resolveGroupingGates(args: {
	groupingActive: boolean
	navigable: boolean
	virtualize: boolean
	pagination: GridPagination | undefined
}): { navigable: boolean; virtualize: boolean; pagination: GridPagination | undefined } {
	if (!args.groupingActive) {
		return { navigable: args.navigable, virtualize: args.virtualize, pagination: args.pagination }
	}

	return { navigable: false, virtualize: false, pagination: undefined }
}

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
	/** One action per configured export type; empty when export is off. */
	exportActions: GridExportAction[]
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
	exportActions,
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
			exportActions={exportActions}
		>
			{reordered}
		</GridContextMenu>
	)
}

/**
 * Wraps the table region in the row drag-reorder `<DndContext>` when rows are
 * reorderable, else renders the region untouched. The context sits outside the
 * `<table>` (its injected a11y nodes must not be table children) and locks drags
 * to the y-axis, bounding them to the scroll container. Split out so
 * {@link GridData} stays within its complexity budget.
 *
 * @internal
 */
function GridRowReorderRegion({
	active,
	dndContextProps,
	children,
}: {
	active: boolean
	dndContextProps: ComponentProps<typeof DndContext>
	children: ReactNode
}) {
	if (!active) return children

	return (
		<DndContext
			{...dndContextProps}
			modifiers={ROW_REORDER_MODIFIERS}
			autoScroll={ROW_REORDER_AUTO_SCROLL}
		>
			{children}
		</DndContext>
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
 * Resolves the column-group band row for the rendered columns: the
 * {@link GridGroupHeader} spans (from the visible column ids and their pin
 * sides) and whether any band actually spans columns. Kept out of
 * {@link GridData} so its branch doesn't weigh on the component's complexity.
 *
 * @internal
 */
function resolveGroupHeaderRow<T>(
	group: GridGroupResult,
	visibleColumns: GridColumn<T>[],
	pinning: GridColumnPinning | null,
): { header: GridGroupHeader | null; hasGroupRow: boolean } {
	if (!group.hasGroups) return { header: null, hasGroupRow: false }

	const header = group.resolveHeader(
		visibleColumns.map((c) => c.id),
		(id) => pinning?.side(id),
	)

	return { header, hasGroupRow: header.spans.some((span) => span.kind === 'group') }
}

/**
 * Effective density under {@link GridDataProps.condensed}: the tight preset
 * forces the compact step for every density-derived metric (cell padding,
 * resize-handle width, virtualized row-height, autosize measurement); a plain
 * grid keeps its resolved level. Kept out of {@link GridData} so its branch
 * doesn't weigh on the component's complexity budget. @internal
 */
function resolveDensity(condensed: boolean, resolved: DensityLevel): DensityLevel {
	return condensed ? 'compact' : resolved
}

/**
 * Table className with the {@link GridDataProps.condensed} down-projections —
 * cell font, header/body icons, and consumer badges — layered onto the resolved
 * layout class, or that class untouched. All cast from the `<table>` onto its
 * descendants, so cells and headers read no context (see `kata/grid`
 * `condensed`). @internal
 */
function condensedTableClass(condensed: boolean, base: string): string {
	return condensed ? cn(base, k.condensed.font, k.condensed.icon, k.condensed.badge) : base
}

/**
 * Broadcasts the grid's resolved density onto the *table region* as a density
 * cascade, so size-aware *client* cell content (a `Sparkline`, an inline `Input`,
 * the selection checkbox) tracks the grid's `density` — and its `condensed` step,
 * which {@link resolveDensity} folds to `compact`. Scoped to the table on purpose
 * — it sits inside the context-menu trigger, below the toolbar/footer, so a
 * portaled overlay (context menu, dialog) the grid spawns stays on the ambient
 * density rather than inheriting the grid's. Static leaves (`Badge`, `Icon`,
 * `Text`) read no density; the `<table>` class down-projects those under
 * `condensed` (see `condensedTableClass`). A grid already at the ambient density
 * broadcasts its own level — a no-op. Kept a component so the branch lives here,
 * off {@link GridData}'s complexity budget. @internal
 */
function DensityCascade({ level, children }: { level: DensityLevel; children: ReactNode }) {
	return <Density scale={densityToSize[level]}>{children}</Density>
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
	groups: groupsConfig,
	groupBy: groupByConfig,
	pagination: paginationConfig,
	resizable = true,
	columnSizing: columnSizingConfig,
	search: searchConfig,
	columnFilters: columnFiltersConfig,
	contextMenu,
	exportable = false,
	reorder = false,
	rowReorder: rowReorderConfig,
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
	footer,
	virtualize,
	tableProps,
	density: densityProp,
	condensed = false,
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
	} = resolveVirtualization(virtualize, density)

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

	// Row grouping: resolve the `groupBy` binding to a groupable data column (a
	// stray id leaves the grid ungrouped), plus the engine expansion state. Grouping
	// renders its own body, so it stands down the cursor, pagination, and
	// virtualization below.
	const isGroupableColumn = useCallback(
		(id: string | number) => isGroupableColumnId(pinnedColumns, id),
		[pinnedColumns],
	)

	const {
		grouping,
		expanded: groupExpanded,
		setExpanded: setGroupExpanded,
		renderHeader: groupRenderHeader,
	} = useGridRowGrouping(groupByConfig, isGroupableColumn)

	const groupingActive = grouping != null

	// Grouping renders its own plain, whole-set body, so the cursor,
	// virtualization, and pagination stand down while it's active (see
	// `resolveGroupingGates`).
	const gated = resolveGroupingGates({
		groupingActive,
		navigable,
		virtualize: virtualizeEnabled,
		pagination: paginationConfig,
	})

	// Resolves a column's display label at call time, read by the `[]`-stable
	// `pinColumn` and the visibility handler so they can narrate the change without
	// closing over (and re-creating on) the columns.
	const columnLabelRef = useRef<(id: string | number) => string>(() => '')

	columnLabelRef.current = (id) => {
		const column = pinnedColumns.find((candidate) => candidate.id === id)

		return column ? columnLabel(column) : String(id)
	}

	const pinColumn = useCallback((id: string | number, side: PinSide | false) => {
		setPinOverrides((prev) => {
			const next = new Map(prev)

			next.set(id, side === false ? 'none' : side)

			return next
		})

		// Narrate the pin change; the header gives no visible text cue (WCAG 4.1.3).
		announce(describePin(columnLabelRef.current(id), side))
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

	// The grid's scroll container (sticky/virtualized), attached below; the cursor
	// measures it for the viewport-relative PageUp/Down step.
	const scrollRef = useRef<HTMLDivElement>(null)

	// A stable click handler so the memoized rows don't churn when the consumer
	// passes an inline `onRowClick`; the cursor also activates its row on Enter.
	const handleRowClick = useStableRowClick(onRowClick)

	// Bridge the row-click into the cursor's Enter/Space activation (see `bridgeRowActivate`).
	const onRowActivate = useMemo(() => bridgeRowActivate(handleRowClick), [handleRowClick])

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

	const {
		table,
		visibleColumns,
		renderRows,
		rowKeys,
		grouped,
		groupedRows,
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
		grouping,
		expanded: groupExpanded,
		onExpandedChange: setGroupExpanded,
		// Grouping renders its own body and stands pagination down (`gated.pagination`
		// is `undefined` while grouping), so the engine doesn't page the groups.
		pagination: gated.pagination,
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

	// Resolve the `exportable` prop into one action per configured export type,
	// each reading the selected rows when a selection is active, else the full
	// filtered + sorted set (all pages) — the engine mirrors the grid's
	// selection `Set` into its own state, so the selected subset keeps the
	// displayed order. Shared by the toolbar's "Export" dropdown and both
	// context menus.
	const exportActions = useGridExport<T>({ exportable, columns: visibleColumns, table })

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

	// Row drag-reorder rides @dnd-kit's vertical sortable; `rowReorderPermitted`
	// gates it on the rendered rows matching the natural source order (see there).
	const rowReorder = useGridRowReorder<T>({
		rowReorder: rowReorderConfig,
		enabled: rowReorderPermitted({
			loading,
			hasData,
			paginated: paginationConfig != null,
			virtualized: virtualizeEnabled,
			grouped,
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

	const ariaRowCount = resolveAriaRowCount(pagination, renderRows.length, groupRowOffset)

	// Full filtered row extent (the server total when paginating) for the busy
	// region's result announcement; the header row the aria count adds is excluded.
	const dataRowCount = pagination?.rowCount ?? renderRows.length

	// Live counts for the optional summary footer, read live off `table` so they
	// track client-side search/filtering (see `resolveFooterStats`); `null` when no
	// `footer` is configured, so no bar renders.
	const footerStats = resolveFooterStats({
		footer,
		table,
		filteredCount: dataRowCount,
		selected: selection.size,
	})

	// Grid semantics (role="grid" + global indices) and the select-all label,
	// derived together from the rendered-window mode; see `resolveGridSemantics`.
	const {
		enabled: gridSemantics,
		rowOffset: pageRowOffset,
		selectAllLabel,
	} = resolveGridSemantics(gated.virtualize, pagination, gated.navigable)

	// A clickable grid reads as actionable through the shared `<Table hover>`
	// wash, layered over any explicit `hover`; the row keeps its own pointer
	// cursor (see `GridRow`). Suppressed through a column drag-resize so the row
	// under the pointer doesn't light up mid-drag.
	const rowHover = resolveHover(hover, onRowClick, resizing)

	// Column and row reorder can't share one grid: they'd need one dnd context to
	// disambiguate a header drag from a row drag. Row reorder takes precedence, so
	// column reorder stands down while it's active (documented on `rowReorder`).
	const reorderActive = canReorder && hasData && !rowReorderActive

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
				className={condensedTableClass(condensed, tableClassName)}
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
					groups={groupHeader}
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
					rowIndexOffset={pageRowOffset + groupRowOffset}
					selection={selection}
					toggleRow={toggleRow}
					selectable={hasSelectionColumn}
					reorderable={reorderActive}
					rowReorderActive={rowReorderActive}
					rowSortable={rowReorder.sortableContext}
					groupedRows={groupedRows}
					groupColumnId={grouping}
					groupRenderHeader={groupRenderHeader}
					getKey={getKey}
					truncate={truncate}
					settleWidths={settleWidths}
					pinning={pinning}
					virtualize={
						gated.virtualize
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
			<GridResizingContext value={resizing}>
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
							onHiddenChange={handleHiddenChange}
							onPinChange={pinColumn}
							groups={group.editorGroups}
							onGroupsChange={group.editorSetGroups}
							onSavePreset={columnManagerConfig?.onSavePreset}
						/>
					)}

					<GridToolbar
						filter={globalFilter}
						showColumnManager={showButton}
						columnManagerLabel={managerLabel}
						onManageColumns={() => setColumnManagerOpen(true)}
						exportActions={exportActions}
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
						exportActions={exportActions}
					>
						<GridRowReorderRegion
							active={rowReorderActive}
							dndContextProps={rowReorder.dndContextProps}
						>
							<DensityCascade level={density}>{tableRegion}</DensityCascade>
						</GridRowReorderRegion>
					</GridRegion>

					<GridFooterBar config={footer} stats={footerStats} />

					{pagination && <GridPaginationFooter pagination={pagination} />}
				</div>
			</GridResizingContext>
		</GridContext>
	)
}
