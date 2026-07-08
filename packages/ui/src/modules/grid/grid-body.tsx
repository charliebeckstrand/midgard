'use client'

import { SortableContext } from '@dnd-kit/sortable'
import type { Row } from '@tanstack/react-table'
import {
	type ComponentProps,
	Fragment,
	type ReactElement,
	type ReactNode,
	type RefObject,
} from 'react'
import { Alert } from '../../components/alert'
import { TableBody, TableEmpty, TableLoading } from '../../components/table'
import type { DensityLevel } from '../../providers/density'
import { hasAggregation } from './grid-aggregate'
import type { ResolvedInfiniteScroll } from './grid-data-resolvers'
import type { GridGroupBy, GridGroupHeaderRow } from './grid-data-types'
import { GridGroupLeafRow } from './grid-group-leaf-row'
import { GridGroupRow } from './grid-group-row'
import {
	GridManualGroupPlaceholderRows,
	GridManualGroupRow,
	type GridManualGroupSegment,
	orderManualGroupSegments,
	segmentManualGroupRows,
} from './grid-manual-group-row'
import { type GridRowsProps, renderGridRow } from './grid-row'
import { GridTotalRow } from './grid-total-row'
import { type GridScrollRowIntoView, GridVirtualizedBody } from './grid-virtualized-body'
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
	 * The engine's grouped display rows (group headers interleaved with expanded
	 * leaves) when grouping is active; `null` otherwise. Rendered in place of the
	 * flat row map, group headers as full-width disclosure rows.
	 */
	groupedRows: Row<T>[] | null
	/**
	 * The consumer-supplied display rows (group headers interleaved with
	 * children, in supplied order) under manual grouping; `null` otherwise.
	 * Rendered in place of the flat row map through the positional segmentation.
	 */
	manualRows: Row<T>[] | null
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
	 * header with its children) by group value — a client-side group sort that
	 * moves whole blocks, so children never leave their header and the backend's
	 * within-group order stands.
	 */
	manualGroupSort: 'asc' | 'desc' | null
	/** Group-header label override from the {@link GridGroupBy} binding, if any. */
	groupRenderHeader: GridGroupBy['renderHeader']
	/** Append a per-group total row under each group's leaves; effective only while columns aggregate. */
	groupTotalRow: 'bottom' | undefined
	/** Row-key resolver, so grouped leaf rows derive their key straight from the engine row. */
	getKey: (row: T, index: number) => string | number
	/** Grid density, threaded to the grouped leaf rows so their reveal wrappers carry the matching cell padding. */
	density: DensityLevel
	/**
	 * The row manager's overlay presentation, or `null` when the grid isn't
	 * client-grouped: the per-group color (tinting the header aggregates, total
	 * footer, and rail) and the manual group / leaf order the grouped body applies.
	 */
	rowGroupPresentation: GridRowGroupPresentation | null
	virtualize: {
		scrollRef: RefObject<HTMLDivElement | null>
		estimateSize: number
		overscan: number
		scrollIntoViewRef: RefObject<GridScrollRowIntoView | null>
		/** Infinite-scroll gates, or `null` when the windowed grid isn't infinite-scrolling. */
		infiniteScroll: ResolvedInfiniteScroll | null
	} | null
}

/**
 * Renders one group as a header row ({@link GridGroupRow}) followed by every one
 * of its leaves ({@link GridGroupLeafRow}). The leaves stay mounted whatever the
 * group's expansion — each animates open/closed from the `expanded` flag — so the
 * collapse plays reliably (rather than relying on `AnimatePresence` to track a
 * table row's exit). Resolved from the shared body wiring, keyed by engine row id.
 *
 * @internal
 */
function renderGroup<T>(
	groupRow: Row<T>,
	args: {
		props: GridBodyProps<T>
		columnId: string | number
		renderHeader: GridGroupBy['renderHeader']
		getKey: (row: T, index: number) => string | number
		density: DensityLevel
		/** Whether a per-group total row shows — a whole-body gate, resolved once by the caller. */
		totalled: boolean
		/** The row-manager overlay presentation (per-group color), or `null` when off. */
		presentation: GridRowGroupPresentation | null
	},
): ReactElement {
	const { props, columnId, renderHeader, getKey, density, totalled, presentation } = args

	const expanded = groupRow.getIsExpanded()

	// The group's row-manager color tints its header aggregates, total footer, and
	// rail; the leaves render in the engine's natural order (row order isn't managed).
	const groupKey = groupRow.getGroupingValue(String(columnId)) as string | number

	const color = presentation?.color(groupKey)

	return (
		<Fragment key={groupRow.id}>
			<GridGroupRow<T>
				row={groupRow}
				columns={props.visibleColumns}
				columnId={columnId}
				renderHeader={renderHeader}
				color={color}
			/>
			{groupRow.subRows.map((leaf) => {
				const key = getKey(leaf.original, leaf.index)

				return (
					<GridGroupLeafRow<T>
						key={leaf.id}
						expanded={expanded}
						cells={leaf.getVisibleCells()}
						row={leaf.original}
						rowKey={key}
						selected={props.selection.has(key)}
						toggleRow={props.toggleRow}
						selectable={props.selectable}
						rowLabel={props.rowLabel?.(leaf.original)}
						onRowClick={props.onRowClick}
						onCellClick={props.onCellClick}
						onRowDoubleClick={props.onRowDoubleClick}
						onCellDoubleClick={props.onCellDoubleClick}
						rowRoving={props.rowRoving}
						cellRoving={props.cellRoving}
						cellActivate={props.cellActivate}
						truncate={props.truncate}
						settleWidths={props.settleWidths}
						pinning={props.pinning}
						density={density}
						color={color}
					/>
				)
			})}
			{totalled && (
				<GridTotalRow<T>
					columns={props.visibleColumns}
					rows={groupRow.subRows.map((leaf) => leaf.original)}
					variant="group"
					expanded={expanded}
					density={density}
					color={color}
				/>
			)}
		</Fragment>
	)
}

/**
 * Renders one manual-grouping segment: its consumer-supplied group-header row
 * ({@link GridManualGroupRow}) followed by the leaves positionally associated
 * with it — each riding the same mounted CSS reveal as the client grouped body,
 * so a group collapses without unmounting its (already fetched) children. A
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
		getKey: (row: T, index: number) => string | number
		density: DensityLevel
	},
): ReactElement {
	const { props, columnId, renderHeader, getKey, density } = args

	const open = segment.info ? args.expanded.has(segment.info.key) : true

	return (
		<Fragment key={segment.header ? segment.header.id : `leading:${index}`}>
			{segment.header && segment.info && (
				<GridManualGroupRow<T>
					row={segment.header.original}
					info={segment.info}
					columns={props.visibleColumns}
					columnId={columnId}
					renderHeader={renderHeader}
					expanded={open}
					toggle={args.toggle}
				/>
			)}
			{segment.leaves.map((leaf) => {
				const key = getKey(leaf.original, leaf.index)

				return (
					<GridGroupLeafRow<T>
						key={leaf.id}
						expanded={open}
						cells={leaf.getVisibleCells()}
						row={leaf.original}
						rowKey={key}
						selected={props.selection.has(key)}
						toggleRow={props.toggleRow}
						selectable={props.selectable}
						rowLabel={props.rowLabel?.(leaf.original)}
						onRowClick={props.onRowClick}
						onCellClick={props.onCellClick}
						onRowDoubleClick={props.onRowDoubleClick}
						onCellDoubleClick={props.onCellDoubleClick}
						rowRoving={props.rowRoving}
						cellRoving={props.cellRoving}
						cellActivate={props.cellActivate}
						truncate={props.truncate}
						settleWidths={props.settleWidths}
						pinning={props.pinning}
						density={density}
					/>
				)
			})}
			{/* Expanded, but its children aren't loaded yet (the consumer's
			    onGroupExpand fetch is in flight): fill the opened group with skeleton
			    placeholders until they land. A group the backend reports empty
			    (count 0) shows nothing. */}
			{segment.info && open && segment.leaves.length === 0 && segment.info.count > 0 && (
				<GridManualGroupPlaceholderRows columns={props.visibleColumns} count={segment.info.count} />
			)}
		</Fragment>
	)
}

/**
 * Body for {@link Grid}: branches between the loading skeleton, the error slot,
 * the `empty` slot, the grouped body, the virtualized window, and the plain row
 * map, threading per-row state to each {@link GridRow}.
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
		groupedRows,
		manualRows,
		manualGroup,
		groupColumnId,
		manualGroupSort,
		groupRenderHeader,
		getKey,
		density,
		rowGroupPresentation,
		virtualize,
	} = props

	if (loading) return <TableLoading columns={visibleColumns.length} />

	// An error state pre-empts the empty slot: a failed fetch has no rows, but the
	// cause isn't "no items". `true` renders a default error alert.
	if (error != null && error !== false) {
		return (
			<TableEmpty columns={visibleColumns.length}>
				{error === true ? (
					<Alert severity="error" variant="soft" title="Couldn't load data" block />
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
						getKey,
						density,
					}),
				)}
			</TableBody>
		)
	}

	if (rows.length === 0) return <TableEmpty columns={visibleColumns.length}>{empty}</TableEmpty>

	// Grouping renders its own body: each group's header row followed by all its
	// leaf rows, which stay mounted and animate open/closed with the group via a
	// CSS reveal (see `renderGroup` / `GridGroupLeafRow`). It stands down
	// virtualization / pagination / grid semantics (see `GridData`), so this
	// precedes the virtualized branch and needs no aria-row bookkeeping.
	if (groupedRows && groupColumnId != null) {
		// Apply the manual group order (kept only until the overlay covers every
		// group; then the engine's group order stands).
		const ordered = applyRowKeyOrder(
			groupedRows,
			rowGroupPresentation?.groupOrder ?? undefined,
			(groupRow) => groupRow.getGroupingValue(String(groupColumnId)) as string | number,
		)

		// The per-group total is meaningful only once a column aggregates; the gate
		// is body-wide, so resolve it once here rather than per group in renderGroup.
		const totalled = props.groupTotalRow === 'bottom' && hasAggregation(visibleColumns)

		return (
			<TableBody>
				{ordered.map((groupRow) =>
					renderGroup(groupRow, {
						props,
						columnId: groupColumnId,
						renderHeader: groupRenderHeader,
						getKey,
						density,
						totalled,
						presentation: rowGroupPresentation,
					}),
				)}
			</TableBody>
		)
	}

	if (virtualize) {
		return <GridVirtualizedBody<T> {...props} {...virtualize} />
	}

	// Header occupies row 1; data rows are offset by 2, plus the page offset so a
	// paginated row reports its place in the full set. Only emitted under grid
	// semantics (a plain table conveys it natively).
	const body = rows.map((row, index) =>
		renderGridRow(props, row, index, gridSemantics ? rowIndexOffset + index + 2 : undefined),
	)

	// When rows are drag-reorderable, the sortable context wraps them (its
	// `<DndContext>` sits outside the `<table>`, provided by the grid). A DOM-less
	// fragment, so it nests inside `<tbody>` without adding an element.
	return (
		<TableBody>
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
