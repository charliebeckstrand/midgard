'use client'

import { createContext } from '../../core'

/** One sorted column: its id and direction. The grid's sort is an ordered list of these. */
export type SortState = {
	column: string | number
	direction: 'asc' | 'desc'
}

/** Table-wide state shared with head and rows: selection, sort, and sticky-header flag. */
export type GridContextValue = {
	selection: Set<string | number>
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
	stickyHeader: boolean
}

/**
 * Reads the enclosing {@link Grid}'s shared selection and sort state.
 *
 * @returns The current {@link GridContextValue}.
 * @throws If called outside a `<Grid>`.
 */
export const [GridContext, useGrid] = createContext<GridContextValue>('Grid')
