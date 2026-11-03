'use client'

import type { RefObject } from 'react'
import type { TableElementProps } from '../../components/table'
import { useA11yRoving } from '../../hooks/a11y/use-a11y-roving'
import { GRID_ROW } from './engine/grid-cell-controls'
import { useGridTabStops } from './use-grid-tab-stops'

/**
 * Which set of elements the grid roves keyboard focus over, resolved from the
 * consumer's click handlers:
 *
 *   - `row`   the clickable rows are the roving items: one holds `tabIndex=0`,
 *             the rest `-1`, and Up/Down move focus between them.
 *   - `cell`  the data cells are the roving items: the same single-tab-stop
 *             model, but two-dimensional (Up/Down/Left/Right) since a cell click
 *             addresses a cell.
 *   - `none`  no roving: the grid carries the keyboard cursor, or has no click
 *             handler at all.
 *
 * @internal
 */
export type GridRovingMode = 'none' | 'row' | 'cell'

/**
 * Roving items in row mode: the clickable rows of the grid's own body. The
 * inert leaves of a collapsed group are not items. `:scope` is the `<table>`
 * that the roving hook queries from. A detail panel can hold a nested grid, so
 * the selector reads only the rows of this table and not the rows of a table in
 * a panel. @internal
 */
const ROW_ITEM_SELECTOR = ':scope > tbody > tr[data-grid-row][data-roving]:not([inert])'

/**
 * Roving items in cell mode: the data cells of the rows of the grid's own body,
 * when the row is not inert. They are in row-major order, so `cols` makes a
 * grid of them. Like {@link ROW_ITEM_SELECTOR}, the selector reads no cell of a
 * nested grid. @internal
 */
const CELL_ITEM_SELECTOR = ':scope > tbody > tr[data-grid-row]:not([inert]) > td[data-roving]'

/**
 * Resolves and wires the roving-tabindex keyboard navigation of a clickable
 * grid that has no keyboard cursor. A click handler turns the cursor on, so
 * this runs only where the cursor stands down: under manual grouping (see
 * `resolveGroupingGates`). Manual grouping never windows its rows, so each
 * roving item stays mounted.
 *
 * The grid is one Tab stop: the roved row or cell. Its active item moves with
 * the arrow keys. Cell handlers rove the data cells (two-dimensional, addressed
 * by `dataColCount`), else row handlers rove the rows. Layers `useA11yRoving`
 * (focus mode, single-tab-stop ownership) over the grid `<table>`. The rows or
 * cells mark themselves `data-roving`, and the hook owns their `tabIndex`.
 *
 * The controls in the data rows leave the tab order, except in the row that
 * holds focus (see `useGridTabStops`). Tab from the roved item thus moves
 * through the controls of its row, and from the last one out of the grid.
 *
 * @returns The resolved {@link GridRovingMode} and the `onKeyDown` to attach to
 * the `<table>`, undefined when inactive. It reads items from `tableRef` on
 * each press, so the row/cell set can change between presses.
 * @internal
 */
export function useGridRoving({
	cursor,
	onRowClick,
	onRowDoubleClick,
	onCellClick,
	onCellDoubleClick,
	tableRef,
	dataColCount,
}: {
	/** Whether the keyboard cursor is on; it owns the keyboard, so roving stands down. */
	cursor: boolean
	/** Whether `onRowClick` is set. */
	onRowClick: boolean
	/** Whether `onRowDoubleClick` is set; Enter or Space on the row fires it when no `onRowClick` is set. */
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
	/** Whether the rows are roving items (row mode). */
	rovingRows: boolean
	/** Whether the data cells are roving items (cell mode). */
	rovingCells: boolean
	/**
	 * The arrow-key handler to merge onto the `<table>`, or `undefined` when
	 * roving is inactive. The table carries `tableRef` through the grid's
	 * composed ref, so roving adds no ref of its own.
	 */
	tableProps: Pick<TableElementProps, 'onKeyDown'> | undefined
} {
	const hasRowClick = onRowClick || onRowDoubleClick

	const hasCellClick = onCellClick || onCellDoubleClick

	const mode: GridRovingMode = cursor
		? 'none'
		: hasCellClick
			? 'cell'
			: hasRowClick
				? 'row'
				: 'none'

	const cellMode = mode === 'cell'

	// `useA11yRoving` runs unconditionally (rules of hooks); when `mode` is
	// `none` it's inert: `manageTabIndex` false skips the tab-stop effect, and
	// the caller drops the returned handler.
	const rovingKeyDown = useA11yRoving(tableRef, {
		itemSelector: cellMode ? CELL_ITEM_SELECTOR : ROW_ITEM_SELECTOR,
		orientation: 'vertical',
		// Two-dimensional in cell mode (Up/Down step a row, Left/Right a column);
		// one-dimensional over rows otherwise.
		cols: cellMode ? Math.max(1, dataColCount) : undefined,
		manageTabIndex: mode !== 'none',
	})

	// The controls in the data rows leave the tab order, so the grid is one tab stop.
	useGridTabStops(tableRef, mode === 'none' ? null : GRID_ROW)

	return {
		rovingRows: mode === 'row',
		rovingCells: cellMode,
		tableProps: mode === 'none' ? undefined : { onKeyDown: rovingKeyDown },
	}
}
