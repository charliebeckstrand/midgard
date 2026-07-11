'use client'

import { useSortable } from '@dnd-kit/sortable'
import { ArrowDown, ArrowUp, GripVertical, Pin } from 'lucide-react'
import { memo, type ReactElement, type ReactNode, useCallback, useRef } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { TableHeader } from '../../components/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { cn, dataAttr } from '../../core'
import { HeadlessProvider } from '../../providers/headless'
import { k } from '../../recipes/kata/grid'
import type { QueryGroupNode } from '../query'
import { useGridResizing } from './context'
import { columnLabel } from './engine/grid-column/label'
import { pinnedHeaderProps } from './engine/grid-pin/styles'
import { columnShiftStyle } from './engine/grid-reorder-compute'
import { ariaSortValue } from './engine/grid-sort/state'
import { showsFilterButton } from './engine/grid-table/views'
import { GridColumnFilterButton } from './grid-column-filter-button'
import { GridColumnResizeHandle } from './grid-column-resize-handle'
import { GridGroupByButton } from './grid-group-by-button'
import { useColumnReorderShift } from './grid-reorder'
import type { GridColumn } from './types'
import type { GridColumnFilter, GridColumnPinning, GridColumnResize } from './use-grid-table'
import { useGridTruncation } from './use-grid-truncation'

/**
 * Header cell for the row drag-handle column: an empty, grip-width `<th>` (the
 * handles live in the body rows) carrying a screen-reader label so the column
 * still names itself. Sticky/pinned like any header.
 *
 * @internal
 */
export function GridDragHandleHeaderCell<T>({
	column,
	colIndex,
	stickyHeader,
	pinning,
}: {
	column: GridColumn<T>
	colIndex: number | undefined
	stickyHeader: boolean
	pinning: GridColumnPinning | null
}) {
	const pinned = pinnedHeaderProps(pinning, column, column.width || undefined)

	return (
		<TableHeader
			aria-colindex={colIndex}
			className={cn(k.rowReorder.cell, stickyHeader && k.sticky.head, pinned.className)}
			style={pinned.style}
		>
			<span className="sr-only">Reorder rows</span>
		</TableHeader>
	)
}

/** Props for the column header cells. @internal */
type GridColumnHeaderProps = {
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
	/** Resize controls for this column, or `null` when it is not resizable. */
	resize: GridColumnResize | null
	/** Whether this column is mid drag-resize. */
	resizing: boolean
	/** Whether the header's sort/resize/filter affordances are live (false on an empty grid). */
	interactive: boolean
	/** Column id for context-menu resolution, or `undefined` for non-data headers. */
	gridCol: string | number | undefined
	/** Per-column filter controls; a filter button shows when the column is filterable. */
	filter: GridColumnFilter | null
	/** The column's live query tree, passed so a filter change re-renders this memoized cell. */
	filterQuery: QueryGroupNode | undefined
	/** Frozen-column controls; a pinned header sticks to its edge. `null` when none. */
	pinning: GridColumnPinning | null
	/** Pins/unpins a column; a frozen header's pin button calls it with `false` to unpin. */
	pinColumn: (column: string | number, side: 'left' | 'right' | false) => void
	/** Whether this column is locked (frozen but immutable); its header shows a static edge arrow, not an unpin button. */
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
	{ column, resize, resizing }: Pick<GridColumnHeaderProps, 'column' | 'resize' | 'resizing'>,
	canResize: boolean,
): ReactNode {
	if (!canResize || !resize) return null

	return (
		<GridColumnResizeHandle
			id={column.id}
			label={columnLabel(column)}
			resize={resize}
			resizing={resizing}
		/>
	)
}

/** Up/down arrow for the active sort column, or `null` when unsorted. @internal */
function sortDirectionIcon(
	sorted: boolean,
	direction: 'asc' | 'desc' | undefined,
): ReactElement | null {
	if (!sorted) return null

	// `shrink-0` keeps the arrow at full size while the adjacent title truncates.
	const className = cn(k.sort.icon({ active: true }), 'shrink-0')

	if (direction === 'asc') return <Icon icon={<ArrowUp />} className={className} />

	if (direction === 'desc') return <Icon icon={<ArrowDown />} className={className} />

	return null
}

/**
 * A column's title on a single line, truncated to an ellipsis when it overflows
 * the header. A truncated title gains a hover/focus {@link Tooltip} revealing the
 * full text — sharing the data cell's sub-pixel overflow detection so the header
 * and its column clip in step. An untruncated title renders just the span; the
 * closed tooltip adds no surface.
 *
 * @remarks Like {@link GridCellContent}, the span stays mounted and the tooltip
 * is gated by `enabled` rather than mounted only while truncated, so the overflow
 * `ResizeObserver` never detaches and a widened column re-measures and closes the
 * tooltip.
 * @internal
 */
function GridHeaderTitle({ title }: { title: ReactNode }): ReactElement {
	// No settle key: the header cell re-renders on its own engine `width` prop
	// (drag and nudge alike), so the commit measure already re-runs at settle —
	// unlike the memoized body cells, which take the snapshot from the grid.
	const [ref, truncated] = useGridTruncation<HTMLSpanElement>()

	const resizing = useGridResizing()

	return (
		// `!resizing` holds the tooltip closed through a column drag-resize: the
		// drag reflows the header, and the overflow tooltip would otherwise flash
		// open over the content the resize is reshaping.
		<Tooltip enabled={truncated && !resizing}>
			<TooltipTrigger>
				{/* `data-grid-content` marks the title leaf so the autosizer reads its
				    intrinsic width and decides the column's header-driven minimum. */}
				<span ref={ref} data-grid-content className={cn(k.head.title)}>
					{title}
				</span>
			</TooltipTrigger>

			<TooltipContent className={cn(k.cell.tooltip)}>{title}</TooltipContent>
		</Tooltip>
	)
}

/** Title text, wrapped in a sort-toggle button when the column is sortable and interactive. @internal */
function ColumnHeaderLabel({
	column,
	sorted,
	direction,
	sortPriority,
	toggleSort,
	interactive,
}: Pick<
	GridColumnHeaderProps,
	'column' | 'sorted' | 'direction' | 'sortPriority' | 'toggleSort' | 'interactive'
>): ReactNode {
	if (!column.sortable || !interactive) return <GridHeaderTitle title={column.title} />

	return (
		<HeadlessProvider>
			<Button
				type="button"
				className={cn(k.sort.button)}
				// A Shift-click folds this column into the existing sort (multi-column);
				// a plain click collapses the sort to just this column.
				onClick={(event) => toggleSort(column.id, event.shiftKey)}
				// The explicit name overrides the inner badge, so fold the multi-column
				// sort priority into it; otherwise the digit is never announced (WCAG 1.3.1).
				aria-label={
					sortPriority != null
						? `Sort by ${columnLabel(column)}, sort priority ${sortPriority}`
						: `Sort by ${columnLabel(column)}`
				}
			>
				<GridHeaderTitle title={column.title} />
				{sortDirectionIcon(sorted, direction)}
				{sortPriority != null && (
					<span aria-hidden className={cn(k.sort.badge)}>
						{sortPriority}
					</span>
				)}
			</Button>
		</HeadlessProvider>
	)
}

/**
 * Pinned column header: an unpin button leading its title. A locked column shows
 * no indicator here — its frozen edge is marked by the boundary border — and a
 * scrolling column renders its title alone; both bypass this.
 *
 * @internal
 */
function GridPinnedHeaderLabel({
	column,
	pinColumn,
	label,
}: {
	column: Pick<GridColumn<unknown>, 'id' | 'title'>
	pinColumn: (column: string | number, side: 'left' | 'right' | false) => void
	label: ReactNode
}) {
	return (
		<span className={cn(k.head.pinned.label)}>
			<button
				type="button"
				className={cn(k.head.pinned.button)}
				aria-label={`Unpin ${columnLabel(column)}`}
				onClick={() => pinColumn(column.id, false)}
			>
				<Icon icon={<Pin />} />
			</button>
			{label}
		</span>
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
	resize,
	resizing,
	interactive,
	gridCol,
	filter,
	filterQuery,
	pinning,
	pinColumn,
	locked,
}: GridColumnHeaderProps) {
	const canResize = (resize?.canResize(column.id) ?? false) && interactive

	// This column's frozen edge (read live from the engine), or `undefined` when it
	// scrolls. A pinned header leads its title with an unpin button; a locked one
	// shows no indicator (its frozen edge reads from the boundary border).
	const pinnedSide = pinning?.side(column.id)

	const label = (
		<ColumnHeaderLabel
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
			{headerResizeHandle({ column, resize, resizing }, canResize)}
		</TableHeader>
	)
})

/** Props for {@link GridReorderableColumnHeader}: the shared header props plus the drag affordance. @internal */
type GridReorderableColumnHeaderProps = GridColumnHeaderProps & {
	/** `true` prefixes the header with a grip handle; `false` makes the whole header the drag handle. */
	handle: boolean
}

/**
 * Reorderable column header cell: registers the `<th>` as a horizontal sortable
 * item and adds a resize separator when the grid is resizable. With `handle`,
 * prefixes the title (and any sort control) with a grip drag handle carrying the
 * pointer/keyboard activator; without it, the whole header cell carries the
 * activator and a grab cursor, and no grip renders — its sort control keeps the
 * pointer cursor as a more specific child.
 *
 * @internal
 */
export const GridReorderableColumnHeader = memo(function GridReorderableColumnHeader({
	column,
	colIndex,
	columnIndex,
	sorted,
	direction,
	sortPriority,
	stickyHeader,
	toggleSort,
	width,
	resize,
	resizing,
	interactive,
	gridCol,
	filter,
	filterQuery,
	handle,
}: GridReorderableColumnHeaderProps) {
	const {
		setNodeRef,
		setActivatorNodeRef,
		attributes,
		listeners,
		transform,
		isDragging,
		isSorting,
	} = useSortable({ id: String(column.id) })

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

	useColumnReorderShift(tableRef, columnIndex, transform?.x ?? 0, isDragging, isSorting)

	const canResize = (resize?.canResize(column.id) ?? false) && interactive

	// dnd-kit's activator attributes set `role="button"`, which on the `<th>` would
	// override its columnheader role and drop `aria-sort`. Strip the role (keeping
	// the focus/aria hints and the sortable roledescription) for the handle-less
	// header, where the cell itself carries these; a gripped header spreads the
	// full set onto its button, where `role="button"` is correct.
	const { role: _role, ...cellActivatorAttributes } = attributes

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
			{...(handle ? undefined : { ...cellActivatorAttributes, ...listeners })}
		>
			{/* `data-grid-header` marks the header's flex row for the autosizer (see the
			    non-reorderable header above). */}
			<span data-grid-header className={cn(k.reorder.layout)}>
				{handle && (
					<button
						type="button"
						ref={setActivatorNodeRef}
						data-dragging={dataAttr(isDragging)}
						className={cn(k.reorder.handle)}
						aria-label={`Reorder ${columnLabel(column)}`}
						{...attributes}
						{...listeners}
					>
						<Icon icon={<GripVertical />} />
					</button>
				)}
				<ColumnHeaderLabel
					column={column}
					sorted={sorted}
					direction={direction}
					sortPriority={sortPriority}
					toggleSort={toggleSort}
					interactive={interactive}
				/>
				{headerAffordances({ column, interactive, filter, filterQuery })}
			</span>
			{headerResizeHandle({ column, resize, resizing }, canResize)}
		</TableHeader>
	)
})
