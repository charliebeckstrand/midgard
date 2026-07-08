'use client'

import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import {
	type ComponentProps,
	type ReactNode,
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
} from 'react'
import { Table } from '../../components/table'
import { announce, cn, dataAttr } from '../../core'
import { useA11yAnnouncements, useControllable } from '../../hooks'
import { Density } from '../../primitives/density'
import { type DensityLevel, densityToSize, useDensityLevel } from '../../providers/density'
import { k } from '../../recipes/kata/grid'
import { isDataColumn } from '../../utilities'
import { GridContext, GridResizingContext, type SortState } from './context'
import { DEFAULT_EXPORTABLE } from './export/export-registry'
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
import { GridContextMenu, useColumnGroupMenu } from './grid-context-menu'
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
import type {
	GridDataProps,
	GridGroupHeaderRow,
	GridInfiniteScroll,
	GridPinningState,
	GridVirtualize,
} from './grid-data-types'
import { GridFooter as GridFooterBar } from './grid-footer'
import { GridGroupByContext, type GridGroupByContextValue } from './grid-group-by-button'
import { GridHead } from './grid-head'
import { useGridMenuActions } from './grid-menu-actions'
import { GridPagination as GridPaginationFooter } from './grid-pagination'
import { applyPinOverrides, type PinSide, toPinOverrides } from './grid-pin-overrides'
import {
	GridReorderContext,
	restrictToFirstScrollableAncestor,
	restrictToHorizontalAxis,
	restrictToVerticalAxis,
} from './grid-reorder'
import {
	cellValue,
	type GridCellClick,
	type GridCellRovingActivate,
	type GridRowClick,
	type GridRowsProps,
} from './grid-row'
import { GridRowManagerDialog } from './grid-row-manager-dialog'
import { useGridSort } from './grid-sort-state'
import { useColumnSettleWidths } from './grid-table-views'
import { GridToolbar } from './grid-toolbar'
import { GridGrandTotalBody, useGridGrandTotal } from './grid-total-row'
import type { GridScrollRowIntoView } from './grid-virtualized-body'
import {
	columnLabel,
	type GridColumn,
	type GridContextMenu as GridContextMenuConfig,
	type GridMenuItem,
	type GridPagination,
} from './types'
import { useGridColumns } from './use-grid-columns'
import { useGridCursor } from './use-grid-cursor'
import { type GridExpansionResult, useGridExpansion } from './use-grid-expansion'
import { useGridExport } from './use-grid-export'
import { type GridGroupHeader, type GridGroupResult, useGridGroup } from './use-grid-group'
import { type GridCellActivate, GridNavContext, type GridRowActivate } from './use-grid-navigation'
import { useGridReorder } from './use-grid-reorder'
import { useGridRoving } from './use-grid-roving'
import { useGridRowGrouping } from './use-grid-row-grouping'
import { type GridRowManagerRegionResult, useGridRowManagerRegion } from './use-grid-row-manager'
import { useGridRowReorder } from './use-grid-row-reorder'
import { useGridSelectionActions, useGridSelectionState } from './use-grid-selection'
import { type GridColumnPinning, isManualPagination, useGridTable } from './use-grid-table'

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
 * Resolves which row-grouping mode is active from the binding slice: client
 * grouping (the engine computes the groups), manual grouping (the consumer's
 * rows carry them — which needs the `groupRow` contract), either (`active`),
 * and the grouping id the engine receives — client mode only, since manual
 * grouping keeps the engine ungrouped. Kept out of {@link GridData} for its
 * complexity budget.
 *
 * @internal
 */
function resolveGroupingMode<T>(args: {
	manual: boolean
	grouping: (string | number) | null
	groupRow: ((row: T) => GridGroupHeaderRow | null) | undefined
}): {
	groupingActive: boolean
	manualGroupingActive: boolean
	active: boolean
	engineGrouping: (string | number) | null
} {
	const groupingActive = !args.manual && args.grouping != null

	const manualGroupingActive = args.manual && args.grouping != null && args.groupRow != null

	return {
		groupingActive,
		manualGroupingActive,
		active: groupingActive || manualGroupingActive,
		engineGrouping: groupingActive ? args.grouping : null,
	}
}

/**
 * The engine's manual group-header predicate — rows the binding's `groupRow`
 * contract marks — or `null` outside manual grouping. Split out so the branch
 * lives here, off {@link GridData}'s complexity budget.
 *
 * @internal
 */
function manualGroupPredicate<T>(
	active: boolean,
	groupRow: ((row: T) => GridGroupHeaderRow | null) | undefined,
): ((row: T) => boolean) | null {
	if (!active || !groupRow) return null

	return (row) => groupRow(row) != null
}

/**
 * Manual-grouping body wiring for {@link GridBody} — the group-header resolver,
 * the expanded key set, and the toggle — or `null` outside manual grouping.
 * Kept off {@link GridData}'s complexity budget.
 *
 * @internal
 */
function resolveManualGroupBody<T>(args: {
	active: boolean
	groupRow: ((row: T) => GridGroupHeaderRow | null) | undefined
	expanded: ReadonlySet<string | number>
	toggle: (key: string | number) => void
}): {
	groupRow: (row: T) => GridGroupHeaderRow | null
	expanded: ReadonlySet<string | number>
	toggle: (key: string | number) => void
} | null {
	if (!args.active || !args.groupRow) return null

	return { groupRow: args.groupRow, expanded: args.expanded, toggle: args.toggle }
}

/**
 * The grouped column's active sort direction under manual grouping, or `null`
 * when the grid isn't manually grouped or its grouped column isn't sorted — what
 * {@link GridBody} reorders the manual group blocks by. Kept off
 * {@link GridData}'s complexity budget.
 *
 * @internal
 */
function manualGroupSortDirection(args: {
	active: boolean
	sort: SortState[]
	grouping: (string | number) | null
}): 'asc' | 'desc' | null {
	if (!args.active) return null

	return args.sort.find((entry) => entry.column === args.grouping)?.direction ?? null
}

/**
 * The group-by context value the header buttons read, or `null` while the
 * `groupBy.groupButton` flag is off — the buttons then render nothing. Kept off
 * {@link GridData}'s complexity budget.
 *
 * @internal
 */
function resolveGroupByContext(args: {
	groupButton: boolean
	grouping: (string | number) | null
	setGrouping: (next: (string | number) | null) => void
	hasData: boolean
}): GridGroupByContextValue | null {
	if (!args.groupButton) return null

	return {
		grouping: args.grouping,
		setGrouping: args.setGrouping,
		enabled: args.hasData,
	}
}

/**
 * Zeroes the grid features that a self-rendering body stands over. Grouping —
 * client or manual — renders its own plain body, so it stands the navigable
 * cursor and virtualization down; client grouping (a whole-set body) also
 * stands pagination down, while manual grouping keeps *manual* pagination (the
 * backend pages the grouped sequence) and drops only a client one, whose
 * arbitrary slice boundaries would tear children from their group headers.
 * Master-detail interleaves auto-height detail rows into the flat body, so it
 * stands the cursor and virtualization down (a window assumes uniform row
 * heights) but keeps pagination — the two compose. Each flag passes through
 * when none is active. Split out so {@link GridData} stays within its
 * complexity budget.
 *
 * @internal
 */
function resolveGroupingGates(args: {
	groupingActive: boolean
	manualGroupingActive: boolean
	expandableActive: boolean
	navigable: boolean
	virtualize: boolean
	pagination: GridPagination | undefined
}): { navigable: boolean; virtualize: boolean; pagination: GridPagination | undefined } {
	// Any self-rendering body stands the cursor and virtualization down.
	const ownBody = args.groupingActive || args.manualGroupingActive || args.expandableActive

	const pagination = args.manualGroupingActive
		? isManualPagination(args.pagination)
			? args.pagination
			: undefined
		: args.groupingActive
			? undefined
			: args.pagination

	return {
		navigable: ownBody ? false : args.navigable,
		virtualize: ownBody ? false : args.virtualize,
		pagination,
	}
}

/**
 * Resolves the master-detail hook into what {@link GridData} threads onward:
 * whether it's active (grouping renders its own body, so expansion stands down
 * under it) and the body wiring the flat rows read — the expanded set, the
 * per-row predicate, the toggle, and the detail renderer — or `null` when
 * inactive. Kept off {@link GridData}'s complexity budget.
 *
 * @internal
 */
function resolveDetailExpansion<T>(
	expansion: GridExpansionResult<T>,
	groupingActive: boolean,
): { active: boolean; body: GridRowsProps<T>['expansion'] } {
	const active = expansion.active && !groupingActive

	if (!active || !expansion.render) return { active: false, body: null }

	return {
		active: true,
		body: {
			expanded: expansion.expanded,
			rowExpandable: expansion.rowExpandable,
			toggle: expansion.toggle,
			render: expansion.render,
		},
	}
}

/**
 * Validates the mutually-dependent grid props up front, throwing a pointed error
 * for a combination the grid can't render: virtualization (or the infinite
 * scroll that implies it) without a sized scroll container, infinite scroll
 * against an explicitly refused window, or alongside the paged footer it
 * replaces. Kept off {@link GridData}'s cognitive-complexity budget. @internal
 */
function assertGridProps(args: {
	virtualize: GridVirtualize | undefined
	maxHeight: string | undefined
	infiniteScroll: GridInfiniteScroll | undefined
	pagination: GridPagination | undefined
}): void {
	if ((args.virtualize || args.infiniteScroll) && !args.maxHeight) {
		throw new Error(
			'<Grid virtualize / infiniteScroll> requires `maxHeight` — the windowed rows need a scroll container of known size: a fixed CSS length, or `"fill"` inside a CSS-sized parent.',
		)
	}

	if (args.infiniteScroll && args.virtualize === false) {
		throw new Error(
			'<Grid infiniteScroll> windows the loaded rows through the virtualized scroll container — it implies `virtualize`, which must not be explicitly `false`.',
		)
	}

	if (args.infiniteScroll && args.pagination) {
		throw new Error(
			'<Grid> takes either `pagination` or `infiniteScroll`, not both — infinite scroll replaces the paged footer.',
		)
	}
}

/**
 * The `virtualize` setting with the `infiniteScroll` implication applied:
 * infinite scroll layers on the virtualized window, so setting it implies
 * `virtualize` rather than requiring three coupled props. An explicit
 * `virtualize` (object or `true`) still tunes the window; the contradictory
 * `virtualize={false}` + `infiniteScroll` throws in {@link assertGridProps}.
 * Kept off {@link GridData}'s complexity budget. @internal
 */
function implyVirtualize(
	virtualize: GridVirtualize | undefined,
	infiniteScroll: GridInfiniteScroll | undefined,
): GridVirtualize | undefined {
	return virtualize ?? (infiniteScroll ? true : undefined)
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
	/** The group-by wiring, or `null` when the group button is off; backs the header menu's "Group by …" item. */
	groupBy: GridGroupByContextValue | null
	autoSizeColumns: (() => void) | null
	/** Re-fits a single column to its content; backs the header menu's "Auto-size this column" item. */
	autoSizeColumn: ((column: string | number) => void) | null
	chooseColumns: (() => void) | null
	/** One action per configured export type; empty when export is off. */
	exportActions: GridExportAction[]
	/** Resolves the group-header menu for a right-clicked group by key, or `null` when the row manager is off. */
	rowGroupMenu: ((key: string) => GridMenuItem[] | null) | null
	/** Resolves the column-group band menu for a right-clicked group by id. */
	columnGroupMenu: ((id: string) => GridMenuItem[] | null) | null
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
	groupBy,
	autoSizeColumns,
	autoSizeColumn,
	chooseColumns,
	exportActions,
	rowGroupMenu,
	columnGroupMenu,
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
			groupBy={groupBy}
			autoSizeColumns={autoSizeColumns}
			autoSizeColumn={autoSizeColumn}
			chooseColumns={chooseColumns}
			exportActions={exportActions}
			rowGroupMenu={rowGroupMenu}
			columnGroupMenu={columnGroupMenu}
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
 * Mounts the "Manage rows" dialog when the row manager is reachable (client
 * grouping + the header context menu), else renders nothing — keeping the
 * reachability branch off {@link GridData}'s complexity budget.
 *
 * @internal
 */
function GridRowManagerRegionDialog({ region }: { region: GridRowManagerRegionResult }) {
	if (!region.reachable) return null

	return (
		<GridRowManagerDialog
			open={region.open}
			onOpenChange={region.setOpen}
			label="Manage rows"
			groups={region.managerGroups}
			onRecolor={region.recolor}
			onReorderGroups={region.reorderGroups}
		/>
	)
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
 * Adapts the cell-click into the cursor's `onCellActivate`: the cursor speaks
 * display indices, so the bridge resolves them to the cell context — row datum,
 * key, data column, and value — through the live refs at activation time.
 * `undefined` when the grid has no cell click.
 *
 * @internal
 */
function bridgeCellActivate<T>(
	handleCellClick: GridCellClick<T> | undefined,
	refs: {
		rowsRef: RefObject<T[]>
		rowKeysRef: RefObject<(string | number)[]>
		dataColumnsRef: RefObject<GridColumn<T>[]>
	},
): GridCellActivate | undefined {
	if (!handleCellClick) return undefined

	return (rowIdx, colIdx, event) => {
		const row = refs.rowsRef.current[rowIdx]

		const rowKey = refs.rowKeysRef.current[rowIdx]

		const col = refs.dataColumnsRef.current[colIdx]

		if (row === undefined || rowKey === undefined || !col) return

		handleCellClick({ row, rowKey, columnId: col.id, value: cellValue(col, row) }, event)
	}
}

/**
 * Builds the cell-roving activation: a focused cell's Enter/Space fires the cell
 * click then the row click, the order (and pair) a pointer click on the cell
 * fires them in. `undefined` when the grid has neither handler. Kept off
 * {@link GridData}'s complexity budget. @internal
 */
function buildRovingCellActivate<T>(
	handleCellClick: GridCellClick<T> | undefined,
	handleRowClick: GridRowClick<T> | undefined,
): GridCellRovingActivate<T> | undefined {
	if (!handleCellClick && !handleRowClick) return undefined

	return (context, event) => {
		handleCellClick?.(context, event)

		// The activation fires from the cell's `<td>`, so the event's element type
		// is widened to the row-click's `<tr>` signature — as the cursor bridge does.
		handleRowClick?.(context.row, event as unknown as Parameters<GridRowClick<T>>[1])
	}
}

/**
 * Composes the grid's own cell double-click intent (double-click-to-edit, see
 * {@link GridEditableConfig.trigger}) with the consumer's handler on the one
 * built-in event: the internal intent fires first, then the consumer is
 * notified. Either alone passes through untouched; `undefined` when neither is
 * set, so an inert row attaches no handler.
 *
 * @internal
 */
function composeCellDoubleClick<T>(
	internal: GridCellClick<T> | undefined,
	consumer: GridCellClick<T> | undefined,
): GridCellClick<T> | undefined {
	if (!internal || !consumer) return internal ?? consumer

	return (cell, event) => {
		internal(cell, event)

		consumer(cell, event)
	}
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

/** Props for {@link GridScrollRegion}. @internal */
type GridScrollRegionProps = {
	/** Whether the table needs the scroll wrapper (sticky header or virtualization). */
	active: boolean
	scrollRef: RefObject<HTMLDivElement | null>
	maxHeight: string | undefined
	children: ReactNode
}

/**
 * The sticky/virtualized scroll container around the table, or the table
 * untouched when no scroll wrapper is needed. `maxHeight="fill"` sizes by
 * flexing into the parent's box (see `k.fill`) rather than an inline cap; any
 * other value caps the wrapper directly. Split out of {@link GridData} so the
 * branching stays off its complexity budget. @internal
 */
function GridScrollRegion({ active, scrollRef, maxHeight, children }: GridScrollRegionProps) {
	if (!active) return children

	const fillHeight = maxHeight === 'fill'

	return (
		<div
			ref={scrollRef}
			data-slot="grid-scroll"
			className={cn(k.sticky.wrapper, fillHeight && k.fill.scroll)}
			style={maxHeight && !fillHeight ? { maxHeight } : undefined}
		>
			{children}
		</div>
	)
}

/**
 * Wrapper class for the grid's outer `data-slot="grid"` element: the base
 * chrome, plus — under `maxHeight="fill"` — the stretch that hands the
 * consumer's box to the flexing scroll region (see `k.fill`). Kept off
 * {@link GridData}'s complexity budget. @internal
 */
function gridWrapperClass(fill: boolean): string {
	return fill ? cn(k.wrapper, k.fill.wrapper) : cn(k.wrapper)
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
	pinning: pinningConfig,
	columnManager: columnManagerConfig,
	groups: groupsConfig,
	groupBy: groupByConfig,
	groupTotalRow,
	grandTotalRow,
	expandable: expandableConfig,
	pagination: paginationConfig,
	resizable = true,
	columnSizing: columnSizingConfig,
	search: searchConfig,
	columnFilters: columnFiltersConfig,
	contextMenu,
	exportable = DEFAULT_EXPORTABLE,
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

	// Columns sort by default; bake the grid-level default into each data column
	// that doesn't set its own, so head and engine read one resolved flag.
	const resolvedColumns = useMemo(() => resolveSortable(columns, sortable), [columns, sortable])

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
		sortManual: sortConfig?.manual ?? false,
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
		autoSizeColumn,
		chooseColumns,
	} = useGridMenuActions<T>({
		contextMenu,
		columnManagerConfig,
		resize,
		setSort,
		hasData,
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
	// `canReorder` to register each draggable cell against it.
	const { canReorder, itemIds, strategy, dndContextProps, activeId } = useGridReorder<T>({
		reorder,
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
				outline={outline}
				striped={striped}
				hover={rowHover}
				className={condensedTableClass(condensed, tableClassName)}
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

	const tableRegion = (
		<GridScrollRegion active={needsScrollWrapper} scrollRef={scrollRef} maxHeight={maxHeight}>
			{cursorContent}
		</GridScrollRegion>
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
							hidden={hiddenColumns}
							onHiddenChange={handleHiddenChange}
							onPinChange={pinColumn}
							groups={group.editorGroups}
							onGroupsChange={group.editorSetGroups}
							onSavePreset={columnManagerConfig?.onSavePreset}
						/>
					)}

					<GridRowManagerRegionDialog region={rowManager} />

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
