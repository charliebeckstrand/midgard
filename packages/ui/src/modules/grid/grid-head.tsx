'use client'

import { useSortable } from '@dnd-kit/sortable'
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react'
import { type KeyboardEvent, memo, type ReactElement, type ReactNode } from 'react'
import { Button } from '../../components/button'
import { Checkbox } from '../../components/checkbox'
import { Icon } from '../../components/icon'
import { TableHead, TableHeader, TableRow } from '../../components/table'
import { cn, dataAttr } from '../../core'
import { HeadlessProvider } from '../../providers/headless'
import { k } from '../../recipes/kata/grid'
import { isDataColumn } from '../../utilities'
import type { QueryGroupNode } from '../query'
import { useGrid } from './context'
import { GridColumnFilterButton } from './grid-column-filter-button'
import { COLUMN_RESIZE_STEP } from './grid-constants'
import { columnDragStyle } from './grid-reorder'
import type { GridColumn } from './types'
import type { GridColumnFilter, GridColumnResize } from './use-grid-table'

/** Props for {@link GridHead}. @internal */
type GridHeadProps<T> = {
	columns: GridColumn<T>[]
	hasRows: boolean
	/** When the body is virtualized, the header is row 1 of the full aria-rowcount set. */
	virtualized?: boolean
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
}

/**
 * Header row for {@link Grid}: one {@link GridHeaderCell} per column, reading
 * selection and sort state from {@link useGrid}. When `reorderable`, visible
 * non-pinned data columns carry a drag handle backed by the column-reorder
 * sortable; when `resize` is supplied, data columns size from the engine and
 * gain a resize separator.
 */
export function GridHead<T>({
	columns,
	hasRows,
	virtualized,
	reorderable = false,
	resize,
	filters,
}: GridHeadProps<T>) {
	return (
		<TableHead>
			<TableRow aria-rowindex={virtualized ? 1 : undefined}>
				{columns.map((col, colIdx) => (
					<GridHeaderCell
						key={col.id}
						column={col}
						// Header column indices accompany the virtualized row-index scheme.
						colIndex={virtualized ? colIdx + 1 : undefined}
						hasRows={hasRows}
						reorderable={reorderable}
						resize={resize ?? null}
						filters={filters ?? null}
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
	hasRows: boolean
	reorderable: boolean
	resize: GridColumnResize | null
	filters: GridColumnFilter | null
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
	reorderable,
	resize,
	filters,
}: GridHeaderCellProps<T>) {
	const { allSelected, someSelected, toggleAll, sort, toggleSort, stickyHeader } = useGrid()

	if (column.selectable) {
		return (
			<TableHeader
				aria-colindex={colIndex}
				className={cn(k.selectCell, stickyHeader && k.sticky.head, column.headerClassName)}
				style={column.width ? { width: column.width } : undefined}
			>
				{hasRows && (
					<Checkbox
						checked={allSelected}
						indeterminate={someSelected && !allSelected}
						onChange={toggleAll}
						aria-label="Select all rows"
					/>
				)}
			</TableHeader>
		)
	}

	const sorted = sort?.column === column.id

	const direction = sorted ? sort?.direction : undefined

	// Engine-driven width and the resize handle apply to data columns only.
	const sizing = resize && isDataColumn(column) ? resize : null

	const width = sizing ? sizing.getSize(column.id) : column.width

	const resizing = sizing ? sizing.isResizing(column.id) : false

	const shared = {
		column,
		colIndex,
		sorted,
		direction,
		stickyHeader,
		toggleSort,
		width,
		resize: sizing,
		resizing,
		// Sort/resize/filter affordances stand down on an empty grid: there's
		// nothing to order, size to, or filter until rows arrive.
		interactive: hasRows,
		// Identifies a data-column header to the right-click context menu.
		gridCol: isDataColumn(column) ? column.id : undefined,
		// Per-column filter controls; the header shows a filter button when set.
		filter: filters,
		// The column's live query, read here (this cell re-renders on filter
		// changes) so the memoized header re-renders when it changes — the
		// filter button's controlled QueryBuilder reads it, not `filter` live.
		filterQuery: filters?.getQuery(column.id),
	}

	// Reorder also stands down when empty (handled here so the cell drops the
	// drag activator entirely rather than rendering an inert grip).
	if (reorderable && hasRows && isDataColumn(column) && !column.pinned) {
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
	stickyHeader: boolean
	toggleSort: (column: string | number) => void
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
}

/** A column's accessible name: its `title` when a string, else the stringified id. @internal */
function headerLabel(column: Pick<GridColumn<unknown>, 'id' | 'title'>): string {
	return typeof column.title === 'string' ? column.title : String(column.id)
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

	const className = cn(k.sort.icon({ active: true }))

	if (direction === 'asc') return <Icon icon={<ArrowUp />} className={className} />

	if (direction === 'desc') return <Icon icon={<ArrowDown />} className={className} />

	return null
}

/** Title text, wrapped in a sort-toggle button when the column is sortable and interactive. @internal */
function ColumnHeaderLabel({
	column,
	sorted,
	direction,
	toggleSort,
	interactive,
}: Pick<
	GridColumnHeaderProps,
	'column' | 'sorted' | 'direction' | 'toggleSort' | 'interactive'
>): ReactNode {
	if (!column.sortable || !interactive) return column.title

	return (
		<HeadlessProvider>
			<Button
				type="button"
				className={cn(k.sort.button)}
				onClick={() => toggleSort(column.id)}
				aria-label={`Sort by ${headerLabel(column)}`}
			>
				{column.title}
				{sortDirectionIcon(sorted, direction)}
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
	const canResize = (resize?.canResize(column.id) ?? false) && interactive

	return (
		<TableHeader
			aria-colindex={colIndex}
			aria-sort={ariaSortValue(column.sortable && interactive, sorted, direction)}
			data-resizable={dataAttr(canResize)}
			data-grid-col={gridCol}
			className={cn(
				stickyHeader && k.sticky.head,
				canResize && !stickyHeader && k.resize.cell,
				column.headerClassName,
			)}
			style={width != null ? { width } : undefined}
		>
			<span className={cn(k.filter.slot)}>
				<ColumnHeaderLabel
					column={column}
					sorted={sorted}
					direction={direction}
					toggleSort={toggleSort}
					interactive={interactive}
				/>
				{interactive && filter?.canFilter(column.id) && (
					<GridColumnFilterButton column={column} filter={filter} query={filterQuery} />
				)}
			</span>
			{canResize && resize && (
				<GridColumnResizeHandle
					id={column.id}
					label={headerLabel(column)}
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
					aria-label={`Reorder ${headerLabel(column)}`}
					{...attributes}
					{...listeners}
				>
					<Icon icon={<GripVertical />} />
				</button>
				<ColumnHeaderLabel
					column={column}
					sorted={sorted}
					direction={direction}
					toggleSort={toggleSort}
					interactive={interactive}
				/>
				{interactive && filter?.canFilter(column.id) && (
					<GridColumnFilterButton column={column} filter={filter} query={filterQuery} />
				)}
			</span>
			{canResize && resize && (
				<GridColumnResizeHandle
					id={column.id}
					label={headerLabel(column)}
					resize={resize}
					resizing={resizing}
				/>
			)}
		</TableHeader>
	)
})
