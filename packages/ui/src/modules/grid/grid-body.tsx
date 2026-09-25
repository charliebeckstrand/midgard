'use client'

import { SortableContext } from '@dnd-kit/sortable'
import {
	type ComponentProps,
	Fragment,
	type ReactElement,
	type ReactNode,
	type RefObject,
} from 'react'
import { Alert } from '../../components/alert'
import { TableBody, TableEmpty } from '../../components/table'
import type { PaletteColor } from '../../core/recipe'
import type { DensityLevel } from '../../providers/density'
import {
	type GridManualGroupSegment,
	orderManualGroupSegments,
	segmentManualGroupRows,
} from './engine/grid-group/segments'
import type { GridGroup, GridLeaf } from './engine/grid-group/tree'
import { detailOpen, groupTotaled, groupValueOf, totalItemKey } from './engine/grid-items/items'
import { ariaRowIndex } from './engine/grid-row/shell'
import { detailCursorRows, GridCursorOrder, groupedCursorRows } from './grid-cursor-order'
import type { ResolvedInfiniteScroll } from './grid-data-resolvers'
import type { GridGroupBy, GridGroupHeaderRow } from './grid-data-types'
import { GridGroupLeafRow } from './grid-group-leaf-row'
import { GridGroupRow } from './grid-group-row'
import { GridManualGroupPlaceholderRows, GridManualGroupRow } from './grid-manual-group-row'
import { type GridRowsProps, renderGridRow } from './grid-row'
import { GridLoadingBody } from './grid-skeleton-cells'
import { GridTotalRow } from './grid-total-row'
import { type GridScrollRowIntoView, GridVirtualizedBody } from './grid-virtualized-body'
import { GridVirtualizedDetailBody } from './grid-virtualized-detail-body'
import { GridVirtualizedGroupedBody } from './grid-virtualized-grouped-body'
import { applyRowKeyOrder, type GridRowGroupPresentation } from './use-grid-row-manager'

/** The vertical row sortable's items and strategy, spread onto the body's `SortableContext`. @internal */
type GridRowSortableContext = {
	itemIds: ComponentProps<typeof SortableContext>['items']
	strategy: ComponentProps<typeof SortableContext>['strategy']
}

/** Props for {@link GridBody}. @internal */
type GridBodyProps<T> = GridRowsProps<T> & {
	loading: boolean
	empty: ReactNode
	/** Error-state node shown in place of the body; `true` for a default alert. Takes precedence over `empty`. */
	error: ReactNode
	/**
	 * Row-reorder sortable context (items + strategy) wrapping the plain body
	 * rows when {@link GridRowsProps.rowReorderActive}; `null` otherwise. The
	 * enclosing grid provides the `<DndContext>` outside the `<table>`.
	 */
	rowSortable: GridRowSortableContext | null
	/**
	 * The groups in display order, each with all of its leaves, when grouping is
	 * active; `null` otherwise. Rendered in place of the flat row map, group
	 * headers as full-width disclosure rows.
	 */
	groups: GridGroup<T>[] | null
	/** Opens or closes a group, by its id. */
	toggleGroup: (id: string) => void
	/**
	 * The consumer-supplied display rows (group headers interleaved with
	 * children, in supplied order) under manual grouping; `null` otherwise.
	 * Rendered in place of the flat row map through the positional segmentation.
	 */
	manualRows: GridLeaf<T>[] | null
	/**
	 * Manual-grouping body wiring, or `null` outside manual grouping: the
	 * group-header resolver, the expanded key set, and the toggle that writes it
	 * back through the binding.
	 */
	manualGroup: {
		groupRow: (row: T) => GridGroupHeaderRow | null
		expanded: ReadonlySet<string | number>
		toggle: (key: string | number) => void
	} | null
	/** The grouped column id, read for each group header's value; `null` when ungrouped. */
	groupColumnId: string | number | null
	/**
	 * The grouped column's active sort direction under manual grouping, or `null`
	 * when unsorted or not manually grouped. Reorders the group blocks (each
	 * header with its children) by group value. It is a client-side group sort
	 * that moves whole blocks, so children never leave their header and the
	 * backend's within-group order stands.
	 */
	manualGroupSort: 'asc' | 'desc' | null
	/** Group-header label override from the {@link GridGroupBy} binding, if any. */
	groupRenderHeader: GridGroupBy['renderHeader']
	/** Append a per-group total row under each group's leaves; effective only while columns aggregate. */
	groupTotalRow: boolean | undefined
	/** Grid density, threaded to the grouped leaf rows so their reveal wrappers carry the matching cell padding. */
	density: DensityLevel
	/**
	 * The row manager's overlay presentation, or `null` when the grid isn't
	 * client-grouped. It holds the per-group color, which tints the header
	 * aggregates, total footer, and rail. It also holds the manual group order the
	 * grouped body applies.
	 */
	rowGroupPresentation: GridRowGroupPresentation | null
	virtualize: {
		scrollRef: RefObject<HTMLDivElement | null>
		estimateSize: number
		overscan: number
		scrollIntoViewRef: RefObject<GridScrollRowIntoView | null>
		/** Infinite-scroll gates, or `null` when the windowed grid isn't infinite-scrolling. */
		infiniteScroll: ResolvedInfiniteScroll | null
		/** Re-fits the columns once the window's rows render, when the autosizer had none to measure. */
		fitRenderedRows: () => void
		/** Whether the header sticks, so the window aligns a row below it. */
		stickyHeader: boolean
	} | null
}

/**
 * The {@link GridGroupLeafRow} prop block the client-grouped and manual-grouped
 * bodies share. It is the leaf's identity/selection wiring from the shared body
 * props, plus the caller's expansion state. Under client grouping it also
 * carries the group color.
 *
 * @internal
 */
function leafRowProps<T>(
	props: GridBodyProps<T>,
	leaf: GridLeaf<T>,
	args: {
		expanded: boolean
		density: DensityLevel
		color?: PaletteColor
		/** The leaf's treegrid level; the client-grouped body sets it. */
		level?: number
	},
): ComponentProps<typeof GridGroupLeafRow<T>> {
	return {
		expanded: args.expanded,
		columns: props.visibleColumns,
		row: leaf.row,
		rowKey: leaf.key,
		selected: props.selection.has(leaf.key),
		toggleRow: props.toggleRow,
		selectable: props.selectable,
		rowLabel: props.rowLabel?.(leaf.row),
		onRowClick: props.onRowClick,
		onCellClick: props.onCellClick,
		onRowDoubleClick: props.onRowDoubleClick,
		onCellDoubleClick: props.onCellDoubleClick,
		rowRoving: props.rowRoving,
		cellRoving: props.cellRoving,
		cellActivate: props.cellActivate,
		truncate: props.truncate,
		pinning: props.pinning,
		density: args.density,
		color: args.color,
		level: args.level,
	}
}

/**
 * Renders one group as a header row ({@link GridGroupRow}) followed by every one
 * of its leaves ({@link GridGroupLeafRow}). The leaves stay mounted whatever the
 * group's expansion, and each animates open/closed from the `expanded` flag. The
 * collapse therefore plays reliably, rather than relying on `AnimatePresence` to
 * track a table row's exit. Resolved from the shared body wiring, keyed by group id.
 *
 * @internal
 */
function renderGroup<T>(
	group: GridGroup<T>,
	args: {
		props: GridBodyProps<T>
		columnId: string | number
		renderHeader: GridGroupBy['renderHeader']
		density: DensityLevel
		/** Whether a per-group total row shows — a whole-body gate, resolved once by the caller. */
		totaled: boolean
		/** The row-manager overlay presentation (per-group color), or `null` when off. */
		presentation: GridRowGroupPresentation | null
	},
): ReactElement {
	const { props, columnId, renderHeader, density, totaled, presentation } = args

	const { expanded } = group

	// The group's row-manager color tints its header aggregates, total footer, and
	// rail; the leaves render in the engine's natural order (row order isn't managed).
	const color = presentation?.color(groupValueOf(group))

	return (
		<Fragment key={group.id}>
			<GridGroupRow<T>
				group={group}
				onToggle={props.toggleGroup}
				columns={props.visibleColumns}
				columnId={columnId}
				renderHeader={renderHeader}
				color={color}
			/>
			{group.leaves.map((leaf) => (
				<GridGroupLeafRow<T>
					key={leaf.id}
					{...leafRowProps(props, leaf, { expanded, density, color, level: 2 })}
				/>
			))}
			{totaled && (
				<GridTotalRow<T>
					columns={props.visibleColumns}
					rows={group.rows}
					variant="group"
					expanded={expanded}
					density={density}
					color={color}
					navKey={totalItemKey(group.id)}
				/>
			)}
		</Fragment>
	)
}

/**
 * Renders one manual-grouping segment: its consumer-supplied group-header row
 * ({@link GridManualGroupRow}), followed by the leaves positionally associated
 * with it. Each leaf rides the same mounted CSS reveal as the client grouped
 * body, so a group collapses without unmounting its (already fetched) children. A
 * leading headerless segment renders its leaves alone, always open.
 *
 * @internal
 */
function renderManualSegment<T>(
	segment: GridManualGroupSegment<T>,
	index: number,
	args: {
		props: GridBodyProps<T>
		columnId: string | number
		renderHeader: GridGroupBy['renderHeader']
		expanded: ReadonlySet<string | number>
		toggle: (key: string | number) => void
		density: DensityLevel
	},
): ReactElement {
	const { props, columnId, renderHeader, density } = args

	const open = segment.info ? args.expanded.has(segment.info.key) : true

	return (
		<Fragment key={segment.header ? segment.header.id : `leading:${index}`}>
			{segment.header && segment.info && (
				<GridManualGroupRow<T>
					row={segment.header.row}
					info={segment.info}
					columns={props.visibleColumns}
					columnId={columnId}
					renderHeader={renderHeader}
					expanded={open}
					toggle={args.toggle}
				/>
			)}
			{segment.leaves.map((leaf) => (
				<GridGroupLeafRow<T>
					key={leaf.id}
					{...leafRowProps(props, leaf, { expanded: open, density })}
				/>
			))}
			{/* Expanded, but its children aren't loaded yet (the consumer's
			    onGroupExpand fetch is in flight): fill the opened group with skeleton
			    placeholders until they land. A group the backend reports empty
			    (count 0) shows nothing. */}
			{segment.info && open && segment.leaves.length === 0 && segment.info.count > 0 && (
				<GridManualGroupPlaceholderRows
					columns={props.visibleColumns}
					count={segment.info.count}
					pinning={props.pinning}
				/>
			)}
		</Fragment>
	)
}

/**
 * The client-grouped body: each group's header row, its leaf rows, and its
 * total row. Under `virtualize` it windows those rows as one item list (see
 * {@link GridVirtualizedGroupedBody}). Without a window every leaf stays
 * mounted and animates open and closed with its group. Split out of
 * {@link GridBody} for its complexity budget.
 *
 * @internal
 */
function renderGroupedBody<T>(
	props: GridBodyProps<T>,
	groups: GridGroup<T>[],
	groupColumnId: string | number,
): ReactElement {
	const { visibleColumns, groupRenderHeader, density, rowGroupPresentation, virtualize } = props

	// Apply the manual group order while the overlay covers every group.
	// Otherwise the engine's group order stands.
	const ordered = applyRowKeyOrder(
		groups,
		rowGroupPresentation?.groupOrder ?? undefined,
		groupValueOf,
	)

	// The per-group total is meaningful only once a column aggregates; the gate
	// is body-wide, so resolve it once here rather than per group in renderGroup.
	const totaled = groupTotaled(props.groupTotalRow, visibleColumns)

	if (virtualize) {
		return (
			<GridVirtualizedGroupedBody<T>
				rowsProps={props}
				groups={ordered}
				toggleGroup={props.toggleGroup}
				columnId={groupColumnId}
				renderHeader={groupRenderHeader}
				totaled={totaled}
				density={density}
				presentation={rowGroupPresentation}
				leafProps={(leaf, expanded, color) =>
					leafRowProps(props, leaf, { expanded, density, color, level: 2 })
				}
				window={virtualize}
			/>
		)
	}

	return (
		<TableBody>
			<GridCursorOrder order={groupedCursorRows(ordered, totaled, props.toggleGroup)} />
			{ordered.map((group) =>
				renderGroup(group, {
					props,
					columnId: groupColumnId,
					renderHeader: groupRenderHeader,
					density,
					totaled,
					presentation: rowGroupPresentation,
				}),
			)}
		</TableBody>
	)
}

/**
 * Body for {@link Grid}. It branches between the loading skeleton, the error
 * slot, the `empty` slot, the grouped body, the virtualized window, and the
 * plain row map. It threads per-row state to each {@link GridRow}.
 *
 * @internal
 */
export function GridBody<T>(props: GridBodyProps<T>) {
	const {
		loading,
		rows,
		visibleColumns,
		empty,
		error,
		gridSemantics,
		rowIndexOffset,
		rowSortable,
		groups,
		manualRows,
		manualGroup,
		groupColumnId,
		manualGroupSort,
		groupRenderHeader,
		density,
		virtualize,
		pinning,
	} = props

	if (loading) return <GridLoadingBody columns={visibleColumns} pinning={pinning} />

	// An error state pre-empts the empty slot: a failed fetch has no rows, but the
	// cause isn't "no items". `true` renders a default error alert.
	if (error != null && error !== false) {
		return (
			<TableEmpty columns={visibleColumns.length}>
				{error === true ? (
					<Alert severity="error" variant="soft" title="Couldn't load data" className="w-full" />
				) : (
					error
				)}
			</TableEmpty>
		)
	}

	// Manual grouping renders the consumer-supplied sequence: group headers (with
	// the backend's counts and aggregates) segmented positionally over the leaves
	// that follow them. Checked before the empty gate — `rows` carries only the
	// leaves, and a fully collapsed server-grouped grid holds headers alone.
	if (manualRows && manualRows.length > 0 && manualGroup && groupColumnId != null) {
		// A sort on the grouped column reorders the group blocks by value; the
		// backend's within-group leaf order (and any headerless leading run) stands.
		const segments = orderManualGroupSegments(
			segmentManualGroupRows(manualRows, manualGroup.groupRow),
			manualGroupSort,
		)

		return (
			<TableBody>
				{segments.map((segment, index) =>
					renderManualSegment(segment, index, {
						props,
						columnId: groupColumnId,
						renderHeader: groupRenderHeader,
						expanded: manualGroup.expanded,
						toggle: manualGroup.toggle,
						density,
					}),
				)}
			</TableBody>
		)
	}

	if (rows.length === 0) return <TableEmpty columns={visibleColumns.length}>{empty}</TableEmpty>

	// Grouping renders its own body (see `renderGroupedBody`). It stands down
	// pagination (see `GridData`), so this precedes the flat virtualized branch.
	if (groups && groupColumnId != null) {
		return renderGroupedBody(props, groups, groupColumnId)
	}

	// The windowed body carries the loading skeleton on from the branch above while
	// its window resolves, so `loading` clearing as the rows land doesn't flash a
	// headers-only, rowless table (see `GridVirtualizedBody`). Master-detail under
	// a window renders each data row and each open panel as an item of one
	// measured window (see `GridVirtualizedDetailBody`).
	if (virtualize) {
		return props.expansion ? (
			<GridVirtualizedDetailBody<T> {...props} {...virtualize} />
		) : (
			<GridVirtualizedBody<T> {...props} {...virtualize} />
		)
	}

	// Global row indices only under grid semantics (a plain table conveys them
	// natively); see `ariaRowIndex` for the offset math.
	const body = rows.map((row, index) =>
		renderGridRow(
			props,
			row,
			index,
			gridSemantics ? ariaRowIndex(rowIndexOffset, index) : undefined,
		),
	)

	// When rows are drag-reorderable, the sortable context wraps them (its
	// `<DndContext>` sits outside the `<table>`, provided by the grid). A DOM-less
	// fragment, so it nests inside `<tbody>` without adding an element.
	// A master-detail body gives its panels to the cursor as rows of their own.
	const { expansion } = props

	return (
		<TableBody>
			{expansion && (
				<GridCursorOrder
					order={detailCursorRows(rows, props.rowKeys, (row, key) =>
						detailOpen(row, key, expansion),
					)}
				/>
			)}
			{rowSortable ? (
				<SortableContext items={rowSortable.itemIds} strategy={rowSortable.strategy}>
					{body}
				</SortableContext>
			) : (
				body
			)}
		</TableBody>
	)
}
