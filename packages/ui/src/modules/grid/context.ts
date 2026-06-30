'use client'

import { createContext } from '../../core'

/** One sorted column: its id and direction. The grid's sort is an ordered list of these. */
export type SortState = {
	column: string | number
	direction: 'asc' | 'desc'
}

/** Table-wide state shared with head and rows: selection flags and toggles, sort, pinning, and resize/sticky-header flags. */
export type GridContextValue = {
	toggleRow: (key: string | number) => void
	toggleAll: () => void
	allSelected: boolean
	someSelected: boolean
	/** The active sort columns in priority order; empty when unsorted. */
	sort: SortState[]
	/**
	 * Cycles a column's sort. `additive` (a Shift-click) folds the column into the
	 * existing sort — appending it, flipping its direction, then dropping it —
	 * leaving the others in place; otherwise the sort collapses to this column
	 * alone, cycling ascending → descending → unsorted.
	 */
	toggleSort: (column: string | number, additive: boolean) => void
	/**
	 * Pins a column to an edge, or unpins it with `false`. Backs the header's pin
	 * button (which unpins) and shares the mutation with the column context menu.
	 */
	pinColumn: (column: string | number, side: 'left' | 'right' | false) => void
	stickyHeader: boolean
	/**
	 * Whether a column drag-resize is in flight. Head and cells read it to
	 * suppress their truncation tooltips for the duration: a resize reflows the
	 * columns, and the overflow tooltip would otherwise flash open over the
	 * content the drag is reshaping.
	 *
	 * @remarks The grid's own truncation surfaces read this flag through the
	 * narrower {@link useGridResizing} instead, so a resize doesn't re-render every
	 * cell through this table-wide value; it stays here for external `useGrid()`
	 * consumers.
	 */
	resizing: boolean
}

/**
 * Reads the enclosing {@link Grid}'s shared selection and sort state.
 *
 * @returns The current {@link GridContextValue}.
 * @throws If called outside a `<Grid>`.
 */
export const [GridContext, useGrid] = createContext<GridContextValue>('Grid')

/**
 * Reads whether a column drag-resize is in flight, mirroring
 * {@link GridContextValue.resizing} on a narrower channel. The grid's truncation
 * surfaces (head titles and body cells) read it to suppress their tooltips for
 * the duration: a resize reflows the columns, and the overflow tooltip would
 * otherwise flash open over the content the drag is reshaping.
 *
 * @remarks A dedicated context so the per-cell truncation reveal subscribes to
 * this flag alone, not the table-wide {@link GridContextValue} — a sort or a
 * select-all churns that value but no longer re-renders every visible truncating
 * cell. Returns `false` outside a `<Grid>`.
 */
export const [GridResizingContext, useGridResizing] = createContext<boolean>('GridResizing', {
	default: false,
})
