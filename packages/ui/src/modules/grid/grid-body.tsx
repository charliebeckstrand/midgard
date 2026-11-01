'use client'

import {
	Fragment,
	memo,
	type ReactElement,
	type ReactNode,
	type RefObject,
	use,
	useMemo,
} from 'react'
import { Alert } from '../../components/alert'
import { TableBody, TableEmpty } from '../../components/table'
import { useIntl } from '../../primitives/intl/use-intl'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { useLocale } from '../../providers/locale'
import { GridReorderKitContext } from './context'
import { hasErrorSlot } from './engine/grid-data/guards'
import { applyRowKeyOrder } from './engine/grid-group/row-manager'
import {
	type GridManualGroupSegment,
	orderManualGroupSegments,
	segmentManualGroupRows,
} from './engine/grid-group/segments'
import type { GridGroup, GridLeaf } from './engine/grid-group/tree'
import {
	detailOpen,
	getGroupKey,
	groupedWindowRowCount,
	groupTotaled,
	totalItemKey,
} from './engine/grid-items/items'
import { gridMessages } from './engine/grid-messages'
import { ariaRowIndex, itemAriaRowIndex } from './engine/grid-row/shell'
import { detailCursorRows, GridCursorOrder, groupedCursorRows } from './grid-cursor-order'
import type { ResolvedInfiniteScroll } from './grid-data-resolvers'
import type { GridGroupBy, GridGroupHeaderRow } from './grid-data-types'
import { GridGroupLeafRow, leafRowProps } from './grid-group-leaf-row'
import { GridGroupRow } from './grid-group-row'
import { GridManualGroupPlaceholderRows, GridManualGroupRow } from './grid-manual-group-row'
import { type GridRowsProps, renderRow } from './grid-row'
import type { GridRowGroupPresentation } from './grid-row-group-types'
import { GridLoadingBody } from './grid-skeleton-cells'
import { GridTotalRow } from './grid-total-row'
import { GridVirtualizedBody } from './grid-virtualized-body'
import { GridVirtualizedDetailBody } from './grid-virtualized-detail-body'
import { GridVirtualizedGroupedBody } from './grid-virtualized-grouped-body'
import type { GridScrollRowIntoView } from './use-grid-navigation'

/** Props for {@link GridBody}. @internal */
type GridBodyProps<T> = GridRowsProps<T> & {
	loading: boolean
	empty: ReactNode
	/** Error-state node shown in place of the body; `true` for a default alert. Takes precedence over `empty`. */
	error: ReactNode
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
	/**
	 * The row manager's overlay presentation, or `null` when the grid isn't
	 * client-grouped. It holds the per-group color, which tints the rail. It
	 * also holds the manual group order the grouped body applies.
	 */
	rowGroupPresentation: GridRowGroupPresentation | null
	virtualize: {
		scrollRef: RefObject<HTMLDivElement | null>
		/**
		 * The row height: the consumer's `estimateSize`, else the measured row (see
		 * `useGridRowHeight`), else a first guess until a row measures.
		 */
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

/** The window wiring of {@link GridBodyProps.virtualize}. @internal */
type GridRowWindow = NonNullable<GridBodyProps<unknown>['virtualize']>

/**
 * Gives the cursor the order of an unwindowed client-grouped body. The order
 * builds only when the groups, the total gate, or the toggle change, so a grid
 * render that holds them builds none. @internal
 */
function GridGroupedCursorOrderImpl<T>({
	groups,
	totaled,
	toggle,
}: {
	groups: GridGroup<T>[]
	totaled: boolean
	toggle: (id: string) => void
}) {
	const order = useMemo(() => groupedCursorRows(groups, totaled, toggle), [groups, totaled, toggle])

	return <GridCursorOrder order={order} />
}

const GridGroupedCursorOrder = memo(GridGroupedCursorOrderImpl) as typeof GridGroupedCursorOrderImpl

/**
 * Gives the cursor the order of an unwindowed master-detail body: each data row,
 * then its panel while open. The order builds only when the rows or the
 * expansion change. @internal
 */
function GridDetailCursorOrderImpl<T>({
	rows,
	rowKeys,
	expanded,
	rowExpandable,
}: {
	rows: readonly T[]
	rowKeys: (string | number)[]
	expanded: ReadonlySet<string | number>
	rowExpandable: (row: T) => boolean
}) {
	const order = useMemo(
		() =>
			detailCursorRows(rows, rowKeys, (row, key) =>
				detailOpen(row, key, { expanded, rowExpandable }),
			),
		[rows, rowKeys, expanded, rowExpandable],
	)

	return <GridCursorOrder order={order} />
}

const GridDetailCursorOrder = memo(GridDetailCursorOrderImpl) as typeof GridDetailCursorOrderImpl

/**
 * Renders one group as a header row ({@link GridGroupRow}) followed by every one
 * of its leaves ({@link GridGroupLeafRow}). The leaves stay mounted whatever the
 * group's expansion, and each animates open/closed from the `expanded` flag. The
 * collapse therefore plays reliably, rather than relying on `AnimatePresence` to
 * track a table row's exit. Resolved from the shared body wiring, keyed by group id.
 *
 * The header takes the place `position`, and the leaves and the total of an
 * expanded group take the places after it, as in the windowed body. The rows
 * of a collapsed group are hidden from assistive tech, so they take no place.
 *
 * @internal
 */
function renderGroup<T>(
	group: GridGroup<T>,
	args: {
		props: GridBodyProps<T>
		columnId: string | number
		renderHeader: GridGroupBy['renderHeader']
		/** Whether a per-group total row shows: a whole-body gate, resolved once by the caller. */
		totaled: boolean
		/** The row-manager overlay presentation (per-group color), or `null` when off. */
		presentation: GridRowGroupPresentation | null
		/** The 0-based place of the header among the rows that assistive tech sees. */
		position: number
	},
): ReactElement {
	const { props, columnId, renderHeader, totaled, presentation, position } = args

	const { expanded } = group

	// The `aria-rowindex` of the row `offset` places after the header.
	const rowIndex = (offset: number) =>
		itemAriaRowIndex(
			props.gridSemantics,
			props.rowIndexOffset,
			offset === 0 || expanded ? position + offset : -1,
		)

	// The group's row-manager color tints its rail; the leaves render in the
	// engine's natural order (row order isn't managed).
	const color = presentation?.color(getGroupKey(group))

	return (
		<Fragment key={group.id}>
			<GridGroupRow<T>
				group={group}
				onToggle={props.toggleGroup}
				columns={props.visibleColumns}
				columnId={columnId}
				renderHeader={renderHeader}
				color={color}
				totaled={totaled}
				pinning={props.pinning}
				aria-rowindex={rowIndex(0)}
			/>
			{group.leaves.map((leaf, index) => (
				<GridGroupLeafRow<T>
					key={leaf.id}
					{...leafRowProps(props, leaf, { expanded, color, level: 2 })}
					aria-rowindex={rowIndex(index + 1)}
				/>
			))}
			{totaled && (
				<GridTotalRow<T>
					columns={props.visibleColumns}
					rows={group.rows}
					pinning={props.pinning}
					variant="group"
					expanded={expanded}
					color={color}
					navKey={totalItemKey(group.id)}
					aria-rowindex={rowIndex(group.leaves.length + 1)}
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
	},
): ReactElement {
	const { props, columnId, renderHeader } = args

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
					pinning={props.pinning}
				/>
			)}
			{segment.leaves.map((leaf) => (
				<GridGroupLeafRow<T> key={leaf.id} {...leafRowProps(props, leaf, { expanded: open })} />
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
function renderGrouped<T>(
	props: GridBodyProps<T>,
	groups: GridGroup<T>[],
	groupColumnId: string | number,
	rowWindow: GridRowWindow | null,
): ReactElement {
	const { visibleColumns, groupRenderHeader, rowGroupPresentation } = props

	// Apply the manual group order while the overlay covers every group.
	// Otherwise the engine's group order stands.
	const ordered = applyRowKeyOrder(
		groups,
		rowGroupPresentation?.groupOrder ?? undefined,
		getGroupKey,
	)

	// The per-group total is meaningful only once a column aggregates; the gate
	// is body-wide, so resolve it once here rather than per group in renderGroup.
	const totaled = groupTotaled(props.groupTotalRow, visibleColumns)

	if (rowWindow) {
		return (
			<GridVirtualizedGroupedBody<T>
				rowsProps={props}
				groups={ordered}
				toggleGroup={props.toggleGroup}
				columnId={groupColumnId}
				renderHeader={groupRenderHeader}
				totaled={totaled}
				presentation={rowGroupPresentation}
				rowWindow={rowWindow}
			/>
		)
	}

	// Each group starts at the place after the rows of the groups above it (see
	// `groupedWindowRowCount`).
	let position = 0

	return (
		<TableBody>
			<GridGroupedCursorOrder groups={ordered} totaled={totaled} toggle={props.toggleGroup} />
			{ordered.map((group) => {
				const node = renderGroup(group, {
					props,
					columnId: groupColumnId,
					renderHeader: groupRenderHeader,
					totaled,
					presentation: rowGroupPresentation,
					position,
				})

				position += groupedWindowRowCount([group], totaled)

				return node
			})}
		</TableBody>
	)
}

/**
 * The ungrouped windowed body: the master-detail window under `expansion`, or
 * else the flat window. Split out of {@link GridBody} for its complexity budget.
 *
 * @internal
 */
function renderWindowed<T>(props: GridBodyProps<T>, rowWindow: GridRowWindow): ReactElement {
	return props.expansion ? (
		<GridVirtualizedDetailBody<T> {...props} {...rowWindow} />
	) : (
		<GridVirtualizedBody<T> {...props} {...rowWindow} />
	)
}

/**
 * The 0-based place of each row among the rows that assistive tech sees. An
 * open detail panel takes the place after its row, as in the windowed body.
 *
 * @internal
 */
function rowPlaces<T>(
	rows: readonly T[],
	rowKeys: (string | number)[],
	expansion: GridBodyProps<T>['expansion'],
): number[] {
	const places: number[] = []

	let next = 0

	for (const [index, row] of rows.entries()) {
		places.push(next)

		next += expansion && detailOpen(row, rowKeys[index] as string | number, expansion) ? 2 : 1
	}

	return places
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
		rowReorderActive,
		groups,
		manualRows,
		manualGroup,
		groupColumnId,
		manualGroupSort,
		groupRenderHeader,
		virtualize,
		pinning,
	} = props

	// The drag and drop module, or `null` until it is loaded. The rows then render at rest.
	const reorderKit = use(GridReorderKitContext)

	const intl = useIntl()

	// A sort on the grouped column collates in the locale of the nearest
	// `LocaleProvider`, as the flat sort does.
	const { locale } = useLocale()

	if (loading) return <GridLoadingBody columns={visibleColumns} pinning={pinning} />

	// An error state pre-empts the empty slot: a failed fetch has no rows, but the
	// cause isn't "no items". `true` renders a default error alert.
	if (hasErrorSlot(error)) {
		return (
			<TableEmpty columns={visibleColumns.length}>
				{error === true ? (
					<Alert
						severity="error"
						variant="soft"
						icon={false}
						title={intl.formatMessage(gridMessages.loadFailed)}
						className="w-full"
					/>
				) : (
					error
				)}
			</TableEmpty>
		)
	}

	// Manual grouping renders the consumer-supplied sequence: group headers (with
	// the backend's counts and aggregates) segmented positionally over the leaves
	// that follow them. Checked before the empty gate: `rows` carries only the
	// leaves, and a fully collapsed server-grouped grid holds headers alone.
	if (manualRows && manualRows.length > 0 && manualGroup && groupColumnId != null) {
		// A sort on the grouped column reorders the group blocks by value; the
		// backend's within-group leaf order (and any headerless leading run) stands.
		const segments = orderManualGroupSegments(
			segmentManualGroupRows(manualRows, manualGroup.groupRow),
			manualGroupSort,
			locale,
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
					}),
				)}
			</TableBody>
		)
	}

	if (rows.length === 0) return <TableEmpty columns={visibleColumns.length}>{empty}</TableEmpty>

	// Grouping renders its own body (see `renderGrouped`). It stands down
	// pagination (see `GridData`), so this precedes the flat virtualized branch.
	if (groups && groupColumnId != null) {
		return renderGrouped(props, groups, groupColumnId, virtualize)
	}

	// The windowed body paints a first window before its scroller measures, which
	// includes a server render (see `GridWindowBody`). Master-detail under a window
	// renders each data row and each open panel as an item of one measured window
	// (see `GridVirtualizedDetailBody`).
	if (virtualize) return renderWindowed(props, virtualize)

	const { expansion } = props

	// Global row indices only under grid semantics (a plain table conveys them
	// natively); see `ariaRowIndex` for the offset math. An open detail panel
	// takes the place after its row, as in the windowed body.
	const places = rowPlaces(rows, props.rowKeys, expansion)

	const rowNodes = rows.map((row, index) =>
		renderRow(
			props,
			row,
			index,
			gridSemantics ? ariaRowIndex(rowIndexOffset, places[index] as number) : undefined,
		),
	)

	// Sort-animated rows load layout projection through one root for the body. The
	// root renders no element, so it nests inside `<tbody>`.
	const body = props.animateSortRows ? <ReducedMotion layout>{rowNodes}</ReducedMotion> : rowNodes

	// When rows are drag-reorderable, the sortable context of the drag and drop
	// module wraps them (its `<DndContext>` sits outside the `<table>`, provided
	// by the grid). A DOM-less fragment, so it nests inside `<tbody>` without
	// adding an element.
	// A master-detail body gives its panels to the cursor as rows of their own.
	return (
		<TableBody>
			{expansion && (
				<GridDetailCursorOrder
					rows={rows}
					rowKeys={props.rowKeys}
					expanded={expansion.expanded}
					rowExpandable={expansion.rowExpandable}
				/>
			)}
			{rowReorderActive && reorderKit ? (
				<reorderKit.RowSortableScope>{body}</reorderKit.RowSortableScope>
			) : (
				body
			)}
		</TableBody>
	)
}
