'use client'

import { Checkbox } from '../../components/checkbox'
import { TableHead, TableHeader, TableRow } from '../../components/table'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'
import { isDataColumn } from '../../utilities'
import { useGrid } from './context'
import { isFrozen, isLocked } from './engine/grid-pin/overrides'
import { pinnedHeaderProps } from './engine/grid-pin/styles'
import { columnSort } from './engine/grid-sort/state'
import {
	GridColumnHeader,
	GridDragHandleHeaderCell,
	GridReorderableColumnHeader,
} from './grid-column-header'
import { GridGroupHead } from './grid-group-head'
import type { GridColumn } from './types'
import type { GridGroupHeader } from './use-grid-group'
import type { GridColumnFilter, GridColumnPinning, GridColumnResize } from './use-grid-table'

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
	 * The reorder drag affordance: `true` prefixes each reorderable header with a
	 * grip button; `false` makes the whole header the drag handle. No effect
	 * unless `reorderable`.
	 * @defaultValue true
	 */
	reorderHandle?: boolean
	/**
	 * Column-resize controls when the grid is `resizable`: data columns take
	 * their width from the engine and gain a resize separator. `null` otherwise.
	 */
	resize?: GridColumnResize | null
	/** Per-column filter controls; renders a filter row beneath the header when present. */
	filters?: GridColumnFilter | null
	/** Frozen-column controls; pins matching headers sticky to an edge. `null` when none. */
	pinning?: GridColumnPinning | null
	/**
	 * Resolved column-group band row, rendered above the column headers. When it
	 * carries at least one group span the header gains a leading band row and the
	 * column headers drop to the second row; `null`/absent leaves a single row.
	 */
	groups?: GridGroupHeader | null
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
	reorderHandle = true,
	resize,
	filters,
	pinning,
	groups,
}: GridHeadProps<T>) {
	// The band row renders only when a group actually spans columns; a groups
	// binding with no visible band leaves the header a single row.
	const hasGroupRow = !!groups && groups.spans.some((span) => span.kind === 'group')

	return (
		<TableHead>
			{hasGroupRow && groups && (
				<GridGroupHead
					header={groups}
					pinning={pinning ?? null}
					ariaRowIndex={gridSemantics ? 1 : undefined}
					gridSemantics={!!gridSemantics}
				/>
			)}

			<TableRow aria-rowindex={gridSemantics ? (hasGroupRow ? 2 : 1) : undefined}>
				{columns.map((col, colIdx) => (
					<GridHeaderCell
						key={col.id}
						column={col}
						// Header column indices accompany the global row-index scheme.
						colIndex={gridSemantics ? colIdx + 1 : undefined}
						columnIndex={colIdx}
						hasRows={hasRows}
						interactive={interactive}
						selectAllLabel={selectAllLabel}
						reorderable={reorderable}
						reorderHandle={reorderHandle}
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
	/** 0-based visible column index, shared with the row cells so a reorder drag keys its CSS-variable shift the same way. */
	columnIndex: number
	/** Visible-rows flag for the select-all checkbox. */
	hasRows: boolean
	/** Source-data flag gating the sort/resize/filter affordances. */
	interactive: boolean
	/** Accessible name for the select-all checkbox. */
	selectAllLabel: string
	reorderable: boolean
	/** Grip (`true`) vs. whole-header (`false`) drag affordance for a reorderable header. */
	reorderHandle: boolean
	resize: GridColumnResize | null
	filters: GridColumnFilter | null
	pinning: GridColumnPinning | null
}

/**
 * Routes one column to its header cell: the select-all checkbox for the
 * selectable column, the empty drag-handle header for the row-reorder column, a
 * reorderable header for draggable data columns, or a plain sort header
 * otherwise — resolving the engine width and resize controls for data columns
 * along the way.
 *
 * @internal
 */
function GridHeaderCell<T>({
	column,
	colIndex,
	columnIndex,
	hasRows,
	interactive,
	selectAllLabel,
	reorderable,
	reorderHandle,
	resize,
	filters,
	pinning,
}: GridHeaderCellProps<T>) {
	const { allSelected, someSelected, toggleAll, sort, toggleSort, pinColumn, stickyHeader } =
		useGrid()

	if (column.selectable) {
		const pinned = pinnedHeaderProps(pinning, column, column.width || undefined)

		return (
			<TableHeader
				aria-colindex={colIndex}
				className={cn(k.cell.select, stickyHeader && k.sticky.head, pinned.className)}
				style={pinned.style}
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

	if (column.dragHandle) {
		return (
			<GridDragHandleHeaderCell
				column={column}
				colIndex={colIndex}
				stickyHeader={stickyHeader}
				pinning={pinning}
			/>
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
		columnIndex,
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
		// Unpins a column; backs the pin button a (non-locked) frozen header shows.
		pinColumn,
		// A locked column is frozen but immutable: its header shows a static edge
		// arrow (pointing to the frozen edge) rather than an unpin button.
		locked: isLocked(column),
	}

	// `reorderable` already folds in the source-data gate (its caller passes
	// `canReorder && hasData`), so the cell drops the drag activator with no data.
	// Frozen columns (pinned or locked) are never reorderable.
	if (reorderable && isDataColumn(column) && !isFrozen(column)) {
		return <GridReorderableColumnHeader {...shared} handle={reorderHandle} />
	}

	return <GridColumnHeader {...shared} />
}
