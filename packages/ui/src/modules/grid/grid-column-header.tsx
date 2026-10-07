'use client'

import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import {
	memo,
	type ReactNode,
	type PointerEvent as ReactPointerEvent,
	use,
	useCallback,
	useMemo,
	useRef,
} from 'react'
import { TableHeader } from '../../components/table'
import { cn, dataAttr } from '../../core'
import { SortableGrip } from '../../primitives/sortable-grip/sortable-grip'
import { k } from '../../recipes/kata/grid'
import type { QueryGroup } from '../query'
import { columnLabel } from './engine/grid-column/label'
import { pinnedHeaderProps } from './engine/grid-pin/styles'
import { columnShiftStyle } from './engine/grid-reorder-compute'
import { ariaSortValue } from './engine/grid-sort/state'
import { showsFilterButton } from './engine/grid-table/filter-view'
import type { GridColumnResizeActions } from './engine/grid-table/resize-view'
import { GridColumnFilterButton } from './grid-column-filter-button'
import { GridColumnHeaderLabel, GridPinnedHeaderLabel } from './grid-column-header-label'
import { GridColumnResizeHandle } from './grid-column-resize-handle'
import { GridGroupByButton } from './grid-group-by-button'
import { GridReorderKitContext, useColumnReorderShift } from './grid-reorder'
import type { GridColumn } from './types'
import type { GridColumnFilter, GridColumnPinning } from './use-grid-table'

/**
 * The handle-less header's drag activators, deaf to a press on a child that opens
 * a surface.
 *
 * A `reorder={{ handle: false }}` header *is* its own activator, so every control
 * inside it — the filter button, its applied-state menu — sits on the drag
 * target. Pressing one arms the sensor. A few pixels of drift past the activation
 * distance lifts the column. The surface that opens then takes the `pointerup`
 * with it, stranding the column as if it were still held. The user sees columns
 * reordering under a pointer that is only moving toward the sheet they just
 * opened. (Same shape as the macOS Ctrl-click case {@link PrimaryPointerSensor}
 * filters: a press whose release never comes back.)
 *
 * `aria-haspopup` is the discriminator rather than a tag list, because it names
 * exactly the property that matters — this control is about to open something.
 * The sort control and the header's bare padding carry no popup and stay fully
 * draggable, so the whole-header grab affordance is untouched.
 *
 * @internal
 */
function useSurfaceSafeActivators(
	listeners: DraggableSyntheticListeners,
): DraggableSyntheticListeners {
	return useMemo(() => {
		if (!listeners) return listeners

		return Object.fromEntries(
			Object.entries(listeners).map(([name, handler]) => [
				name,
				(event: ReactPointerEvent<HTMLElement>) => {
					if ((event.target as HTMLElement).closest?.('[aria-haspopup]')) return

					;(handler as (event: ReactPointerEvent<HTMLElement>) => void)(event)
				},
			]),
		)
	}, [listeners])
}

/** Props for the column header cells. @internal */
export type GridColumnHeaderProps = {
	column: Pick<
		GridColumn<unknown>,
		'id' | 'title' | 'sortable' | 'headerClassName' | 'filterType' | 'filterOptions' | 'groupable'
	>
	colIndex: number | undefined
	/** 0-based visible column index; a reorderable header writes its drag shift to the CSS variable keyed by it. */
	columnIndex: number
	sorted: boolean
	direction: 'asc' | 'desc' | undefined
	/** 1-based sort priority shown as a badge under a multi-column sort; `undefined` otherwise. */
	sortPriority: number | undefined
	stickyHeader: boolean
	toggleSort: (column: string | number, additive: boolean) => void
	/** Resolved width: engine size (px) when resizable, else the column's CSS `width`. */
	width: number | string | undefined
	/**
	 * The resize actions, or `null` when this column is not resizable. The
	 * object keeps its identity across the frames of a drag, so a drag renders
	 * again only the header whose width changed.
	 */
	resizeActions: GridColumnResizeActions | null
	/** The resize bounds of the column (px), for the separator. */
	minWidth: number
	maxWidth: number
	/** Whether this column is mid drag-resize. */
	resizing: boolean
	/** Whether the header's sort/resize/filter affordances are live (false on an empty grid). */
	interactive: boolean
	/** Column id for context-menu resolution, or `undefined` for non-data headers. */
	gridCol: string | number | undefined
	/** Per-column filter controls; a filter button shows when the column is filterable. */
	filter: GridColumnFilter | null
	/** The column's live query tree, passed so a filter change re-renders this memoized cell. */
	filterQuery: QueryGroup | undefined
	/** Frozen-column controls; a pinned header sticks to its edge. `null` when none. */
	pinning: GridColumnPinning | null
	/** Pins/unpins a column; a frozen header's pin button calls it with `false` to unpin. */
	pinColumn: (column: string | number, side: 'left' | 'right' | false) => void
	/** Whether this column is locked (frozen and immutable). Its header shows no unpin button, and the boundary border marks its edge. */
	locked: boolean
}

/**
 * The affordances after a header's label — the group-by toggle and, for a
 * filterable column, the filter button. One definition shared by the plain and
 * reorderable headers; a plain function, not a component, so it adds no
 * boundary to the render tree.
 *
 * @internal
 */
function headerAffordances({
	column,
	interactive,
	filter,
	filterQuery,
}: Pick<GridColumnHeaderProps, 'column' | 'interactive' | 'filter' | 'filterQuery'>): ReactNode {
	return (
		<>
			<GridGroupByButton column={column} />
			{filter && showsFilterButton(filter, column.id, interactive, filterQuery) && (
				<GridColumnFilterButton column={column} filter={filter} query={filterQuery} />
			)}
		</>
	)
}

/**
 * The trailing resize separator of a resizable header, or `null` when the
 * column cannot resize. The other block the two headers repeated verbatim.
 *
 * @internal
 */
function headerResizeHandle(
	{
		column,
		width,
		resizeActions,
		minWidth,
		maxWidth,
		resizing,
	}: Pick<
		GridColumnHeaderProps,
		'column' | 'width' | 'resizeActions' | 'minWidth' | 'maxWidth' | 'resizing'
	>,
	canResize: boolean,
): ReactNode {
	if (!canResize || !resizeActions || typeof width !== 'number') return null

	return (
		<GridColumnResizeHandle
			id={column.id}
			label={columnLabel(column)}
			size={width}
			min={minWidth}
			max={maxWidth}
			actions={resizeActions}
			resizing={resizing}
		/>
	)
}

/** Single column header cell; renders a sort-toggle button and, when resizable, a resize separator. @internal */
export const GridColumnHeader = memo(function GridColumnHeader({
	column,
	colIndex,
	sorted,
	direction,
	sortPriority,
	stickyHeader,
	toggleSort,
	width,
	resizeActions,
	minWidth,
	maxWidth,
	resizing,
	interactive,
	gridCol,
	filter,
	filterQuery,
	pinning,
	pinColumn,
	locked,
}: GridColumnHeaderProps) {
	const canResize = resizeActions !== null && interactive

	// This column's frozen edge, or `undefined` when it scrolls. A pinned header
	// leads its title with an unpin button; a locked one shows no indicator (its
	// frozen edge reads from the boundary border).
	const pinnedSide = pinning?.column(column.id)?.side

	const label = (
		<GridColumnHeaderLabel
			column={column}
			sorted={sorted}
			direction={direction}
			sortPriority={sortPriority}
			toggleSort={toggleSort}
			interactive={interactive}
		/>
	)

	const pinned = pinnedHeaderProps(pinning, column, width ?? undefined)

	return (
		<TableHeader
			aria-colindex={colIndex}
			aria-sort={ariaSortValue(column.sortable && interactive, sorted, direction)}
			data-resizable={dataAttr(canResize)}
			data-grid-col={gridCol}
			className={cn(
				stickyHeader && k.sticky.head,
				canResize && !stickyHeader && k.resize.cell,
				pinned.className,
			)}
			style={pinned.style}
			data-grid-pin={pinned.pin}
		>
			{/* `data-grid-header` marks the header's flex row so the autosizer can
			    subtract its justified free space and measure the title + affordances. */}
			<span data-grid-header className={cn(k.filter.slot)}>
				{pinnedSide && !locked ? (
					<GridPinnedHeaderLabel column={column} pinColumn={pinColumn} label={label} />
				) : (
					label
				)}
				{headerAffordances({ column, interactive, filter, filterQuery })}
			</span>
			{headerResizeHandle(
				{ column, width, resizeActions, minWidth, maxWidth, resizing },
				canResize,
			)}
		</TableHeader>
	)
})

/** Props for {@link GridReorderableColumnHeader}: the shared header props plus the drag affordance. @internal */
export type GridReorderableColumnHeaderProps = GridColumnHeaderProps & {
	/** `true` prefixes the header with a grip handle; `false` makes the whole header the drag handle. */
	handle: boolean
}

/**
 * The drag bindings of a reorderable header, from dnd-kit's `useSortable`. The
 * `attributes` are absent until the drag and drop module is loaded.
 *
 * @internal
 */
export type GridColumnSortable = {
	setNodeRef: (node: HTMLElement | null) => void
	setActivatorNodeRef: (node: HTMLElement | null) => void
	attributes: DraggableAttributes | undefined
	listeners: DraggableSyntheticListeners
	/** The horizontal translate of the drag, in px. */
	x: number
	isDragging: boolean
	isSorting: boolean
}

/** Does nothing with a node, for the static bindings. @internal */
const ignoreNode = () => {}

/**
 * The bindings of a header before the drag and drop module is loaded: a header
 * at rest, which no drag can start. @internal
 */
const STATIC_COLUMN_SORTABLE: GridColumnSortable = {
	setNodeRef: ignoreNode,
	setActivatorNodeRef: ignoreNode,
	attributes: undefined,
	listeners: undefined,
	x: 0,
	isDragging: false,
	isSorting: false,
}

/**
 * Reorderable column header cell. It renders the draggable header of the drag
 * and drop module when that module is loaded (see {@link GridReorderKitContext}),
 * else the same header at rest, with the same layout.
 *
 * @internal
 */
export const GridReorderableColumnHeader = memo(function GridReorderableColumnHeader(
	props: GridReorderableColumnHeaderProps,
) {
	const kit = use(GridReorderKitContext)

	if (kit) return <kit.SortableColumnHeader {...props} />

	return <GridReorderableColumnHeaderView {...props} sortable={STATIC_COLUMN_SORTABLE} />
})

/**
 * The cell of a reorderable column header: registers the `<th>` through the
 * `sortable` bindings and adds a resize separator when the grid is resizable.
 * With `handle`, it prefixes the title (and any sort control) with a grip drag
 * handle carrying the pointer/keyboard activator. Without it, the whole header
 * cell carries the activator and a grab cursor, and no grip renders. Its sort
 * control keeps the pointer cursor as a more specific child.
 *
 * @internal
 */
export function GridReorderableColumnHeaderView({
	column,
	colIndex,
	columnIndex,
	sorted,
	direction,
	sortPriority,
	stickyHeader,
	toggleSort,
	width,
	resizeActions,
	minWidth,
	maxWidth,
	resizing,
	interactive,
	gridCol,
	filter,
	filterQuery,
	handle,
	sortable,
}: GridReorderableColumnHeaderProps & { sortable: GridColumnSortable }) {
	const { setNodeRef, setActivatorNodeRef, attributes, listeners, x, isDragging, isSorting } =
		sortable

	// The header animates its live drag translate onto a CSS variable on the
	// enclosing <table> — the nearest common ancestor of this header and its
	// column's body cells — which the whole column reads (see `columnShiftStyle` /
	// `useColumnReorderShift`), so it glides without re-rendering a single cell.
	// Resolve the table from the header node as it mounts.
	const tableRef = useRef<HTMLTableElement | null>(null)

	const setHeaderNodeRef = useCallback(
		(node: HTMLTableCellElement | null) => {
			setNodeRef(node)

			// A handle-less header is its own drag activator: the whole cell carries
			// the pointer/keyboard sensor. A gripped header sets the activator on its
			// button instead (below), so the cell isn't registered as one.
			if (!handle) setActivatorNodeRef(node)

			if (node) tableRef.current = node.closest('table')
		},
		[setNodeRef, setActivatorNodeRef, handle],
	)

	useColumnReorderShift(tableRef, columnIndex, x, isDragging, isSorting)

	const canResize = resizeActions !== null && interactive

	// dnd-kit's activator attributes set `role="button"`, which on the `<th>` would
	// override its columnheader role and drop `aria-sort`. They also set
	// `aria-pressed` while a drag runs, which a columnheader does not allow, and
	// `aria-roledescription="sortable"`, which hides "column header". The
	// handle-less header strips all three and keeps the focus stop and the
	// `aria-disabled` and `aria-describedby` hints. The grip of a gripped header is
	// a `SortableGrip`, which strips only the redundant role.
	const {
		role: _role,
		'aria-pressed': _pressed,
		'aria-roledescription': _roleDescription,
		...cellActivatorAttributes
	} = attributes ?? {}

	const cellActivators = useSurfaceSafeActivators(listeners)

	return (
		<TableHeader
			ref={setHeaderNodeRef}
			aria-colindex={colIndex}
			aria-sort={ariaSortValue(column.sortable && interactive, sorted, direction)}
			data-dragging={dataAttr(isDragging)}
			data-resizable={dataAttr(canResize)}
			data-grid-col={gridCol}
			className={cn(
				stickyHeader ? k.sticky.head : k.reorder.shift,
				k.reorder.cell,
				// Handle-less: the whole cell is the grab target (grabbing while lifted).
				!handle && k.reorder.grab,
				// Anchor the absolute resize handle on a non-sticky header (a sticky
				// header already positions itself; this header's shift transform also
				// forms a containing block, so `relative` just keeps the anchor explicit).
				canResize && !stickyHeader && k.resize.cell,
				column.headerClassName,
			)}
			// Read the shift from the same CSS variable the body cells use (written
			// just below), not dnd-kit's transform inline: one variable resolving in
			// one style recalc keeps the header and its column's cells exactly in
			// phase through the transition, instead of two mechanisms drifting apart.
			style={{ ...columnShiftStyle(columnIndex), ...(width != null ? { width } : null) }}
			// The handle-less cell carries the drag activator; the gripped cell leaves
			// it to the button below.
			{...(handle ? undefined : { ...cellActivatorAttributes, ...cellActivators })}
		>
			{/* `data-grid-header` marks the header's flex row for the autosizer (see the
			    non-reorderable header above). */}
			<span data-grid-header className={cn(k.reorder.layout)}>
				{handle && (
					<SortableGrip
						sortable={{ setActivatorNodeRef, attributes, listeners, dragging: isDragging }}
						label={`Reorder ${columnLabel(column)}`}
						className={cn(k.reorder.handle)}
					/>
				)}
				<GridColumnHeaderLabel
					column={column}
					sorted={sorted}
					direction={direction}
					sortPriority={sortPriority}
					toggleSort={toggleSort}
					interactive={interactive}
				/>
				{headerAffordances({ column, interactive, filter, filterQuery })}
			</span>
			{headerResizeHandle(
				{ column, width, resizeActions, minWidth, maxWidth, resizing },
				canResize,
			)}
		</TableHeader>
	)
}
