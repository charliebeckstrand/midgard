'use client'

import { useSyncExternalStore } from 'react'
import { createContext } from '../../core'
import type { GridSettleStore } from './engine/grid-sizing/settle'

/** One sorted column: its id and direction. The grid's sort is an ordered list of these. */
export type GridSortState = {
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
	sort: GridSortState[]
	/**
	 * Cycles a column's sort. The `additive` (a Shift-click) folds the column into
	 * the existing sort, and leaves the others in place. It appends the column,
	 * flips its direction, then drops it. Otherwise the sort collapses to this
	 * column alone and cycles per `GridSort.cycle`. The default cycle is ascending
	 * → descending → unsorted.
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
	 * suppress their truncation tooltips for the duration. A resize reflows the
	 * columns, and the overflow tooltip would otherwise flash open over the
	 * content the drag is reshaping.
	 *
	 * @remarks The grid's own truncation surfaces read this flag through the
	 * narrower {@link useGridResizing} instead. A resize therefore doesn't
	 * re-render every cell through this table-wide value. It stays here for
	 * external `useGrid()` consumers.
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
 * Reads the store of settled column widths (see {@link GridSettleStore}). A
 * visited body cell subscribes to its own column in it, and measures its
 * overflow again when that width settles.
 *
 * @remarks A store and not a value, so a resize does not render the rows. The
 * store keeps one identity for the life of the grid. Returns `null` outside a
 * `<Grid>`.
 */
export const [GridSettleContext, useGridSettle] = createContext<GridSettleStore | null>(
	'GridSettle',
	{ default: null },
)

/** Subscribes to nothing, for a read outside a `<Grid>`. @internal */
const subscribeNone = () => () => {}

/** Reads no drag, for a read outside a `<Grid>` and on the server. @internal */
const notResizing = () => false

/**
 * Reads whether a column drag-resize is in flight, mirroring
 * {@link GridContextValue.resizing} on a narrower channel. The grid's truncation
 * surfaces (head titles and body cells) read it to suppress their tooltips for
 * the duration. A resize reflows the columns, and the overflow tooltip would
 * otherwise flash open over the content the drag is reshaping.
 *
 * @remarks It subscribes to the drag state of the {@link GridSettleStore}, not
 * to the table-wide {@link GridContextValue}. Only a surface that calls it
 * renders again when a drag starts or ends. A body cell calls it only while it
 * shows a reveal. Returns `false` outside a `<Grid>`.
 */
export function useGridResizing(): boolean {
	const settle = useGridSettle()

	return useSyncExternalStore(
		settle?.subscribeResizing ?? subscribeNone,
		settle?.resizing ?? notResizing,
		notResizing,
	)
}

/**
 * The active quick-search query when the grid searches in highlight mode
 * ({@link GridSearch.mode} `'highlight'`). It is `null` when the grid filters, has no
 * query, or has no search at all. Data cells read it to mark the matched
 * substring in the columns the search scans. A query change re-renders only the
 * cells that subscribe, so the default (filtering, or unsearched) grid pays nothing.
 *
 * @remarks A dedicated context, like {@link GridSettleContext}, so the marking
 * subscribes to the query alone rather than the table-wide {@link GridContextValue}.
 * Returns `null` outside a `<Grid>`.
 */
export const [GridHighlightContext, useGridHighlight] = createContext<string | null>(
	'GridHighlight',
	{ default: null },
)

/**
 * The direction of the enclosing grid, or `null` outside one. The column
 * manager opens in a dialog that portals out of the grid, so it cannot inherit
 * the `dir` of the grid. It reads the direction here instead. The pin labels
 * and arrows of the manager name the physical edge in that direction.
 *
 * @internal
 */
export const [GridDirectionContext, useGridDirection] = createContext<'ltr' | 'rtl' | null>(
	'GridDirection',
	{ default: null },
)
