'use client'

import { SortableContext } from '@dnd-kit/sortable'
import type { ComponentProps, ReactNode, RefObject } from 'react'
import { Alert } from '../../components/alert'
import { TableBody, TableEmpty, TableLoading } from '../../components/table'
import { type GridRowsProps, renderGridRow } from './grid-row'
import { type GridScrollRowIntoView, GridVirtualizedBody } from './grid-virtualized-body'

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
	virtualize: {
		scrollRef: RefObject<HTMLDivElement | null>
		estimateSize: number
		overscan: number
		scrollIntoViewRef: RefObject<GridScrollRowIntoView | null>
	} | null
}

/**
 * Body for {@link Grid}: branches between the loading skeleton, the error slot,
 * the `empty` slot, the virtualized window, and the plain row map, threading
 * per-row state to each {@link GridRow}.
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

	if (rows.length === 0) return <TableEmpty columns={visibleColumns.length}>{empty}</TableEmpty>

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
