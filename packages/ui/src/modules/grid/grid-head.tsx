'use client'

import { useSortable } from '@dnd-kit/sortable'
import { ArrowDown, ArrowUp, GripVertical, Pin } from 'lucide-react'
import { type KeyboardEvent, memo, type ReactElement, type ReactNode } from 'react'
import { Button } from '../../components/button'
import { Checkbox } from '../../components/checkbox'
import { Icon } from '../../components/icon'
import { TableHead, TableHeader, TableRow } from '../../components/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { cn, dataAttr } from '../../core'
import { HeadlessProvider } from '../../providers/headless'
import { k } from '../../recipes/kata/grid'
import { isDataColumn } from '../../utilities'
import type { QueryGroupNode } from '../query'
import { type SortState, useGrid } from './context'
import { GridColumnFilterButton } from './grid-column-filter-button'
import { COLUMN_RESIZE_STEP } from './grid-constants'
import { pinnedClassName, pinnedOffsetStyle } from './grid-pinning'
import { columnDragStyle } from './grid-reorder'
import { columnLabel, type GridColumn } from './types'
import type { GridColumnFilter, GridColumnPinning, GridColumnResize } from './use-grid-table'
import { useGridTruncation } from './use-grid-truncation'

/** Props for {@link GridHead}. @internal */
type GridHeadProps<T> = {
	columns: GridColumn<T>[]
	/** Whether any rows are *visible* (post-filter); gates the select-all checkbox. */
	hasRows: boolean
	/** Whether there is *source* data; gates the sort/resize/filter affordances. */
	interactive: boolean
	/**
	 * Accessible name for the select-all checkbox. Under pagination it toggles
	 * only the current page, so {@link Grid} narrows the label to say so.
	 * @defaultValue 'Select all rows'
	 */
	selectAllLabel?: string
	/**
	 * When the rendered body is a window onto a larger set (virtualization or
	 * pagination), the header is row 1 of the full `aria-rowcount` set and each
	 * cell carries an `aria-colindex`.
	 */
	gridSemantics?: boolean
	/**
	 * Renders each visible non-pinned data column with a drag handle and
	 * registers it as a sortable item. The enclosing {@link Grid} owns the
	 * dnd context and commits the reorder.
	 * @defaultValue false
	 */
	reorderable?: boolean
	/**
	 * Column-resize controls when the grid is `resizable`: data columns take
	 * their width from the engine and gain a resize separator. `null` otherwise.
	 */
	resize?: GridColumnResize | null
	/** Per-column filter controls; renders a filter row beneath the header when present. */
	filters?: GridColumnFilter | null
	/** Frozen-column controls; pins matching headers sticky to an edge. `null` when none. */
	pinning?: GridColumnPinning | null
}

/**
 * Header row for {@link Grid}: one {@link GridHeaderCell} per column, reading
 * selection and sort state from {@link useGrid}. When `reorderable`, visible
 * non-pinned data columns carry a drag handle backed by the column-reorder
 * sortable; when `resize` is supplied, data columns size from the engine and
 * gain a resize separator.
 *
 * @internal
 */
export function GridHead<T>({
	columns,
	hasRows,
	interactive,
	selectAllLabel = 'Select all rows',
	gridSemantics,
	reorderable = false,
	resize,
	filters,
	pinning,
}: GridHeadProps<T>) {
	return (
		<TableHead>
			<TableRow aria-rowindex={gridSemantics ? 1 : undefined}>
				{columns.map((col, colIdx) => (
					<GridHeaderCell
						key={col.id}
						column={col}
						// Header column indices accompany the global row-index scheme.
						colIndex={gridSemantics ? colIdx + 1 : undefined}
						hasRows={hasRows}
						interactive={interactive}
						selectAllLabel={selectAllLabel}
						reorderable={reorderable}
						resize={resize ?? null}
						filters={filters ?? null}
						pinning={pinning ?? null}
					/>
				))}
			</TableRow>
		</TableHead>
	)
}

/** Props for {@link GridHeaderCell}. @internal */
type GridHeaderCellProps<T> = {
	column: GridColumn<T>
	colIndex: number | undefined
	/** Visible-rows flag for the select-all checkbox. */
	hasRows: boolean
	/** Source-data flag gating the sort/resize/filter affordances. */
	interactive: boolean
	/** Accessible name for the select-all checkbox. */
	selectAllLabel: string
	reorderable: boolean
	resize: GridColumnResize | null
	filters: GridColumnFilter | null
	pinning: GridColumnPinning | null
}

/**
 * A column's place in the priority-ordered sort: whether it sorts, its
 * direction, and its 1-based priority — surfaced only under a multi-column sort,
 * where the ranking is meaningful (a single sort needs no badge).
 *
 * @internal
 */
function columnSort(
	sort: SortState[],
	columnId: string | number,
): { sorted: boolean; direction: 'asc' | 'desc' | undefined; priority: number | undefined } {
	const index = sort.findIndex((entry) => entry.column === columnId)

	if (index === -1) return { sorted: false, direction: undefined, priority: undefined }

	return {
		sorted: true,
		direction: sort[index]?.direction,
		priority: sort.length > 1 ? index + 1 : undefined,
	}
}

/**
 * Routes one column to its header cell: the select-all checkbox for the
 * selectable column, a reorderable header for draggable data columns, or a
 * plain sort header otherwise — resolving the engine width and resize controls
 * for data columns along the way.
 *
 * @internal
 */
function GridHeaderCell<T>({
	column,
	colIndex,
	hasRows,
	interactive,
	selectAllLabel,
	reorderable,
	resize,
	filters,
	pinning,
}: GridHeaderCellProps<T>) {
	const { allSelected, someSelected, toggleAll, sort, toggleSort, stickyHeader } = useGrid()

	if (column.selectable) {
		return (
			<TableHeader
				aria-colindex={colIndex}
				className={cn(
					k.selectCell,
					stickyHeader && k.sticky.head,
					pinnedClassName(pinning, column.id, { header: true }),
					column.headerClassName,
				)}
				style={{
					...(column.width ? { width: column.width } : null),
					...pinnedOffsetStyle(pinning, column.id),
				}}
			>
				{hasRows && (
					<Checkbox
						checked={allSelected}
						indeterminate={someSelected && !allSelected}
						onChange={toggleAll}
						aria-label={selectAllLabel}
					/>
				)}
			</TableHeader>
		)
	}

	const { sorted, direction, priority: sortPriority } = columnSort(sort, column.id)

	// Engine-driven width and the resize handle apply to data columns only.
	const sizing = resize && isDataColumn(column) ? resize : null

	const width = sizing ? sizing.getSize(column.id) : column.width

	const resizing = sizing ? sizing.isResizing(column.id) : false

	const shared = {
		column,
		colIndex,
		sorted,
		direction,
		sortPriority,
		stickyHeader,
		toggleSort,
		width,
		resize: sizing,
		resizing,
		// Sort/resize/filter affordances stand down with no source data: there's
		// nothing to order, size to, or filter until rows exist (a filter that
		// empties the *view* keeps them — `interactive` tracks source data).
		interactive,
		// Identifies a data-column header to the right-click context menu.
		gridCol: isDataColumn(column) ? column.id : undefined,
		// Per-column filter controls; the header shows a filter button when set.
		filter: filters,
		// The column's live query, read here (this cell re-renders on filter
		// changes) so the memoized header re-renders when it changes — the
		// filter button's controlled QueryBuilder reads it, not `filter` live.
		filterQuery: filters?.getQuery(column.id),
		// Frozen-column controls; the header reads them so a pinned cell sticks.
		pinning,
	}

	// `reorderable` already folds in the source-data gate (its caller passes
	// `canReorder && hasData`), so the cell drops the drag activator with no data.
	if (reorderable && isDataColumn(column) && !column.pinned) {
		return <GridReorderableColumnHeader {...shared} />
	}

	return <GridColumnHeader {...shared} />
}

/** Props for the column header cells. @internal */
type GridColumnHeaderProps = {
	column: Pick<
		GridColumn<unknown>,
		'id' | 'title' | 'sortable' | 'headerClassName' | 'filterType' | 'filterOptions'
	>
	colIndex: number | undefined
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
}

/**
 * Whether a filterable column shows its filter button: when the grid has data,
 * or — even with an empty view — when this column carries an active filter, so a
 * filter that emptied the grid can still be reached and cleared.
 *
 * @internal
 */
function showsFilterButton(
	filter: GridColumnFilter,
	columnId: string | number,
	interactive: boolean,
	filterQuery: QueryGroupNode | undefined,
): boolean {
	if (!filter.canFilter(columnId)) return false

	return interactive || (filterQuery?.children.length ?? 0) > 0
}

/**
 * `aria-sort` for a column: the active direction, `'none'` when sortable but not
 * the sort column, and `undefined` when not sortable.
 *
 * @internal
 */
function ariaSortValue(
	sortable: boolean | undefined,
	sorted: boolean,
	direction: 'asc' | 'desc' | undefined,
): 'ascending' | 'descending' | 'none' | undefined {
	if (!sortable) return undefined

	if (!sorted) return 'none'

	return direction === 'asc' ? 'ascending' : 'descending'
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
	const [ref, truncated] = useGridTruncation<HTMLSpanElement>()

	return (
		<Tooltip enabled={truncated}>
			<TooltipTrigger>
				<span ref={ref} className={cn(k.head.title)}>
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
				aria-label={`Sort by ${columnLabel(column)}`}
			>
				<GridHeaderTitle title={column.title} />
				{sortDirectionIcon(sorted, direction)}
				{sortPriority != null && <span className={cn(k.sort.badge)}>{sortPriority}</span>}
			</Button>
		</HeadlessProvider>
	)
}

/** Props for {@link GridColumnResizeHandle}. @internal */
type GridColumnResizeHandleProps = {
	id: string | number
	label: string
	resize: GridColumnResize
	resizing: boolean
}

/**
 * Resize separator on a column's trailing edge: a focusable window-splitter that
 * starts a pointer drag-resize and accepts Arrow keys to nudge the width.
 *
 * @internal
 */
function GridColumnResizeHandle({ id, label, resize, resizing }: GridColumnResizeHandleProps) {
	const onPointer = resize.getResizeHandler(id)

	const { min, max } = resize.bounds(id)

	function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
		if (event.key === 'ArrowLeft') {
			event.preventDefault()

			resize.nudge(id, -COLUMN_RESIZE_STEP)
		} else if (event.key === 'ArrowRight') {
			event.preventDefault()

			resize.nudge(id, COLUMN_RESIZE_STEP)
		}
	}

	return (
		// biome-ignore lint/a11y/useSemanticElements: an interactive window-splitter is role="separator" with aria-value*; <hr> is a non-interactive thematic break
		<span
			role="separator"
			aria-orientation="vertical"
			aria-label={`Resize ${label}`}
			aria-valuenow={Math.round(resize.getSize(id))}
			aria-valuemin={min}
			aria-valuemax={max < Number.MAX_SAFE_INTEGER ? max : undefined}
			tabIndex={0}
			data-resizing={dataAttr(resizing)}
			className={cn(k.resize.handle)}
			onMouseDown={(event) => {
				event.stopPropagation()

				onPointer?.(event)
			}}
			onTouchStart={(event) => {
				event.stopPropagation()

				onPointer?.(event)
			}}
			onClick={(event) => event.stopPropagation()}
			onKeyDown={handleKeyDown}
		>
			<span aria-hidden="true" className={cn(k.resize.grip)} />
		</span>
	)
}

/** Single column header cell; renders a sort-toggle button and, when resizable, a resize separator. @internal */
const GridColumnHeader = memo(function GridColumnHeader({
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
}: GridColumnHeaderProps) {
	const canResize = (resize?.canResize(column.id) ?? false) && interactive

	// This column's frozen edge (read live from the engine), or `undefined` when it
	// scrolls; a frozen header leads its title with a pin indicator.
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

	return (
		<TableHeader
			aria-colindex={colIndex}
			aria-sort={ariaSortValue(column.sortable && interactive, sorted, direction)}
			data-resizable={dataAttr(canResize)}
			data-grid-col={gridCol}
			className={cn(
				stickyHeader && k.sticky.head,
				canResize && !stickyHeader && k.resize.cell,
				pinnedClassName(pinning, column.id, { header: true }),
				column.headerClassName,
			)}
			style={{
				...(width != null ? { width } : null),
				...pinnedOffsetStyle(pinning, column.id),
			}}
		>
			<span className={cn(k.filter.slot)}>
				{pinnedSide ? (
					<span className={cn(k.head.pinnedLabel)}>
						<Icon
							icon={<Pin />}
							size="sm"
							className={cn(k.head.pinIcon)}
							label={`Pinned ${pinnedSide}`}
						/>
						{label}
					</span>
				) : (
					label
				)}
				{filter && showsFilterButton(filter, column.id, interactive, filterQuery) && (
					<GridColumnFilterButton column={column} filter={filter} query={filterQuery} />
				)}
			</span>
			{canResize && resize && (
				<GridColumnResizeHandle
					id={column.id}
					label={columnLabel(column)}
					resize={resize}
					resizing={resizing}
				/>
			)}
		</TableHeader>
	)
})

/**
 * Reorderable column header cell: registers the `<th>` as a horizontal sortable
 * item and prefixes the title (and any sort control) with a grip drag handle
 * that carries the pointer/keyboard activator; adds a resize separator when the
 * grid is resizable.
 *
 * @internal
 */
const GridReorderableColumnHeader = memo(function GridReorderableColumnHeader({
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
}: GridColumnHeaderProps) {
	const {
		setNodeRef,
		setActivatorNodeRef,
		attributes,
		listeners,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: String(column.id) })

	const canResize = (resize?.canResize(column.id) ?? false) && interactive

	return (
		<TableHeader
			ref={setNodeRef}
			aria-colindex={colIndex}
			aria-sort={ariaSortValue(column.sortable && interactive, sorted, direction)}
			data-dragging={dataAttr(isDragging)}
			data-resizable={dataAttr(canResize)}
			data-grid-col={gridCol}
			className={cn(
				stickyHeader ? k.sticky.head : k.reorder.shift,
				k.reorder.cell,
				canResize && !stickyHeader && k.resize.cell,
				column.headerClassName,
			)}
			style={{ ...columnDragStyle(transform, transition), ...(width != null ? { width } : null) }}
		>
			<span className={cn(k.reorder.layout)}>
				<button
					type="button"
					ref={setActivatorNodeRef}
					className={cn(k.reorder.handle)}
					aria-label={`Reorder ${columnLabel(column)}`}
					{...attributes}
					{...listeners}
				>
					<Icon icon={<GripVertical />} />
				</button>
				<ColumnHeaderLabel
					column={column}
					sorted={sorted}
					direction={direction}
					sortPriority={sortPriority}
					toggleSort={toggleSort}
					interactive={interactive}
				/>
				{filter && showsFilterButton(filter, column.id, interactive, filterQuery) && (
					<GridColumnFilterButton column={column} filter={filter} query={filterQuery} />
				)}
			</span>
			{canResize && resize && (
				<GridColumnResizeHandle
					id={column.id}
					label={columnLabel(column)}
					resize={resize}
					resizing={resizing}
				/>
			)}
		</TableHeader>
	)
})
