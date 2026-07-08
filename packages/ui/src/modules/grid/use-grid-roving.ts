'use client'

import type { RefObject } from 'react'
import type { TableElementProps } from '../../components/table'
import { useA11yRoving } from '../../hooks'

/**
 * Which set of elements the grid roves keyboard focus over, resolved from the
 * consumer's click handlers:
 *
 *   - `row`   the clickable rows are the roving items — one holds `tabIndex=0`,
 *             the rest `-1`, and Up/Down move focus between them.
 *   - `cell`  the data cells are the roving items — the same single-tab-stop
 *             model, but two-dimensional (Up/Down/Left/Right) since a cell click
 *             addresses a cell.
 *   - `none`  no row roving — the grid carries the {@link GridDataProps.navigable}
 *             cursor, is virtualized (rows unmount on scroll), or has no click
 *             handler at all.
 *
 * @internal
 */
export type GridRovingMode = 'none' | 'row' | 'cell'

/** Roving items in row mode: clickable body rows, excluding a collapsed group's inert leaves. @internal */
const ROW_ITEM_SELECTOR = 'tr[data-grid-row][data-roving]:not([inert])'

/** Roving items in cell mode: data cells of non-inert body rows (row-major, so `cols` grids them). @internal */
const CELL_ITEM_SELECTOR = 'tr[data-grid-row]:not([inert]) td[data-roving]'

/**
 * Resolves and wires the grid's roving-tabindex keyboard navigation over its
 * rows or data cells. A clickable grid (any row- or cell-level click handler)
 * that doesn't carry the {@link GridDataProps.navigable} cursor becomes a single
 * Tab stop whose active row/cell moves with the arrow keys — cell handlers rove
 * the data cells (two-dimensional, addressed by `dataColCount`), else row
 * handlers rove the rows. Layers `useA11yRoving` (focus mode, single-tab-stop
 * ownership) over the grid `<table>`; the rows/cells mark themselves
 * `data-roving`, and the hook owns their `tabIndex`.
 *
 * Stands down (`mode: 'none'`) under the navigable cursor — which owns the
 * keyboard itself — and under virtualization, whose rows unmount as the window
 * scrolls, so a roved focus could land on an unmounted row.
 *
 * @returns The resolved {@link GridRovingMode} and the `onKeyDown` to attach to
 * the `<table>` (undefined when inactive), which reads items from `tableRef` on
 * each press so the row/cell set may change between presses.
 * @internal
 */
export function useGridRoving({
	navigable,
	virtualized,
	onRowClick,
	onRowDoubleClick,
	onCellClick,
	onCellDoubleClick,
	tableRef,
	dataColCount,
}: {
	/** Whether the navigable cell cursor is active; it owns the keyboard, so roving stands down. */
	navigable: boolean
	/** Whether the body is virtualized; its rows unmount on scroll, so roving stands down. */
	virtualized: boolean
	/** Whether `onRowClick` is set; single-click activation and the virtualized body's legacy static Tab stop. */
	onRowClick: boolean
	/** Whether `onRowDoubleClick` is set. */
	onRowDoubleClick: boolean
	/** Whether `onCellClick` is set; cell handlers take precedence over row handlers. */
	onCellClick: boolean
	/** Whether `onCellDoubleClick` is set. */
	onCellDoubleClick: boolean
	/** The grid `<table>`, the roving container the key handler reads items from. */
	tableRef: RefObject<HTMLTableElement | null>
	/** Count of roving-visitable data columns; the `cols` grid width for two-dimensional cell roving. */
	dataColCount: number
}): {
	mode: GridRovingMode
	/** Whether the rows are roving items (row mode). */
	rovingRows: boolean
	/** Whether the data cells are roving items (cell mode). */
	rovingCells: boolean
	/** Whether each clickable row is the virtualized body's legacy static Tab stop (roving stands down there). */
	rowStaticStop: boolean
	/** The table ref and arrow-key handler to merge onto the `<table>`, or `undefined` when roving is inactive. */
	tableProps: Pick<TableElementProps, 'ref' | 'onKeyDown'> | undefined
} {
	const hasRowClick = onRowClick || onRowDoubleClick

	const hasCellClick = onCellClick || onCellDoubleClick

	const mode: GridRovingMode =
		navigable || virtualized ? 'none' : hasCellClick ? 'cell' : hasRowClick ? 'row' : 'none'

	const cellMode = mode === 'cell'

	// `useA11yRoving` runs unconditionally (rules of hooks); when `mode` is
	// `none` it's inert — `manageTabIndex` false skips the tab-stop effect, and
	// the caller drops the returned handler.
	const rovingKeyDown = useA11yRoving(tableRef, {
		itemSelector: cellMode ? CELL_ITEM_SELECTOR : ROW_ITEM_SELECTOR,
		orientation: 'vertical',
		// Two-dimensional in cell mode (Up/Down step a row, Left/Right a column);
		// one-dimensional over rows otherwise.
		cols: cellMode ? Math.max(1, dataColCount) : undefined,
		manageTabIndex: mode !== 'none',
	})

	return {
		mode,
		rovingRows: mode === 'row',
		rovingCells: cellMode,
		// The legacy per-row Tab stop the virtualized body keeps, where roving
		// stands down but a clickable row should still be reachable by Tab.
		rowStaticStop: onRowClick && virtualized && !navigable,
		tableProps: mode === 'none' ? undefined : { ref: tableRef, onKeyDown: rovingKeyDown },
	}
}
