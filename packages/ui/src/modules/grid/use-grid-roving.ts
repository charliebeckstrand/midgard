'use client'

import { type KeyboardEvent, type RefObject, useCallback, useRef } from 'react'
import type { TableElementProps } from '../../components/table'
import { logicalArrowKey } from '../../hooks/a11y/logical-arrow'
import { queryItems, seatTabStop, useA11yRoving } from '../../hooks/a11y/use-a11y-roving'
import { isActivationKey, wrap } from '../../utilities/keyboard-navigation'
import { hasBrowserModifier } from '../../utilities/modifier-keys'
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
 * Roving items in row mode: the clickable rows and the group headers of the
 * grid's own body. The inert leaves of a collapsed group are not items.
 * `:scope` is the `<table>` that the roving hook queries from. A detail panel
 * can hold a nested grid, so the selector reads only the rows of this table and
 * not the rows of a table in a panel. @internal
 */
const ROW_ITEM_SELECTOR =
	':scope > tbody > :is(tr[data-grid-row][data-roving]:not([inert]), tr[data-group-row][data-roving])'

/**
 * Roving items in cell mode: the data cells of the rows of the grid's own body,
 * when the row is not inert, and the label cell of each group header. One
 * selector, not a list, keeps them in document order, so the items of one row
 * are together. Like
 * {@link ROW_ITEM_SELECTOR}, the selector reads no cell of a nested grid.
 * @internal
 */
const CELL_ITEM_SELECTOR =
	':scope > tbody > :is(tr[data-grid-row]:not([inert]), tr[data-group-row]) > td[data-roving]'

/** Moves the Tab stop to `item`, and focuses it, as an arrow of the roving hook does. */
function focusItem(items: HTMLElement[], item: HTMLElement | undefined): void {
	if (!item) return

	seatTabStop(items, item)

	item.focus()
}

/** The group header row that holds a roving item, or `null` for an item of a data row. */
function findHeaderRow(item: HTMLElement): HTMLElement | null {
	const row = item.closest('tr')

	return row?.hasAttribute('data-group-row') ? row : null
}

/** The items in lines, one line for each row, in the order of the rows. */
function itemLines(items: HTMLElement[]): HTMLElement[][] {
	const lines: HTMLElement[][] = []

	let row: Element | null = null

	for (const item of items) {
		const at = item.closest('tr')

		if (at !== row) lines.push([])

		row = at

		lines.at(-1)?.push(item)
	}

	return lines
}

/**
 * The key of a group header, as on a group header of the cursor (see
 * `stopAction` in `use-grid-navigation`). Enter or Space toggles the group.
 * ArrowRight opens a closed group, and steps into an open one. ArrowLeft
 * closes an open group. The other horizontal arrow does nothing, because the
 * header has one item.
 *
 * @returns `toggle`, `descend`, `swallow`, or `null` for a key that the header does not take.
 */
function headerAction(key: string, header: HTMLElement): 'toggle' | 'descend' | 'swallow' | null {
	const open = header.hasAttribute('data-expanded')

	if (isActivationKey(key)) return 'toggle'

	if (key === 'ArrowRight') return open ? 'descend' : 'toggle'

	if (key === 'ArrowLeft') return open ? 'toggle' : 'swallow'

	return null
}

/**
 * The item that an arrow moves to in cell mode, or `null` for a key that the
 * lines do not decide. The items are not a full grid, because a group header
 * has one item. ArrowUp and ArrowDown step a line, and wrap at the ends. On a
 * data row, they land on the column of the last data cell, or on the last
 * cell of a shorter row. ArrowLeft and ArrowRight step through the data cells
 * in reading order, and wrap at the ends.
 */
function cellModeTarget(
	key: string,
	items: HTMLElement[],
	current: HTMLElement,
	col: number,
): HTMLElement | null {
	if (key === 'ArrowLeft' || key === 'ArrowRight') {
		const cells = items.filter((item) => !findHeaderRow(item))

		const at = cells.indexOf(current)

		if (at === -1) return null

		return cells[wrap(at + (key === 'ArrowRight' ? 1 : -1), cells.length)] ?? null
	}

	if (key !== 'ArrowUp' && key !== 'ArrowDown') return null

	const lines = itemLines(items)

	const at = lines.findIndex((line) => line.includes(current))

	const line = lines[wrap(at + (key === 'ArrowDown' ? 1 : -1), lines.length)]

	if (!line) return null

	const header = line[0] && findHeaderRow(line[0])

	return (header ? line[0] : line[Math.min(col, line.length - 1)]) ?? null
}

/**
 * Takes a key on a roving item when a group header or cell mode decides it:
 * the keys of a group header (see {@link headerAction}), and the arrows of cell
 * mode (see {@link cellModeTarget}). A move seats the Tab stop on the item that
 * it focuses.
 *
 * @param col - The column of the last data cell that cell mode left. A move
 *   from a data cell writes it.
 * @returns Whether the key was taken. The roving hook takes a key that was not.
 */
function handleItemKey(
	event: KeyboardEvent<HTMLTableElement>,
	items: HTMLElement[],
	current: HTMLElement,
	cellMode: boolean,
	col: RefObject<number>,
): boolean {
	const key = logicalArrowKey(event.key, event.currentTarget)

	const header = findHeaderRow(current)

	const action = header ? headerAction(key, header) : null

	if (action === 'toggle' || action === 'swallow') {
		event.preventDefault()

		if (action === 'toggle') header?.querySelector('button')?.click()

		return true
	}

	if (cellMode && !header) {
		col.current =
			itemLines(items)
				.find((line) => line.includes(current))
				?.indexOf(current) ?? 0
	}

	// An open group steps into its first row, as ArrowDown does.
	const descend = action === 'descend'

	const step = descend ? 'ArrowDown' : key

	let target: HTMLElement | null | undefined

	if (cellMode) target = cellModeTarget(step, items, current, col.current)
	else if (descend) target = items[items.indexOf(current) + 1]

	if (!target) {
		if (descend) event.preventDefault()

		return descend
	}

	event.preventDefault()

	focusItem(items, target)

	return true
}

/**
 * Resolves and wires the roving-tabindex keyboard navigation of a clickable
 * grid that has no keyboard cursor. A click handler turns the cursor on, so
 * this runs only where the cursor stands down: under manual grouping (see
 * `resolveGroupingGates`). Manual grouping never windows its rows, so each
 * roving item stays mounted.
 *
 * The grid is one Tab stop: the roved row or cell. Its active item moves with
 * the arrow keys. Cell handlers rove the data cells, else row handlers rove the
 * rows. Each group header is an item too: its row in row mode, and its label
 * cell in cell mode. The keys of a header are those of a group header of the
 * cursor (see `headerAction`). Layers `useA11yRoving` (focus mode,
 * single-tab-stop ownership) over the grid `<table>`. The rows or cells mark
 * themselves `data-roving`, and the hook owns their `tabIndex`.
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
}): {
	/** The resolved {@link GridRovingMode}. */
	mode: GridRovingMode
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

	let mode: GridRovingMode = 'none'

	if (!cursor && hasCellClick) mode = 'cell'
	else if (!cursor && hasRowClick) mode = 'row'

	const cellMode = mode === 'cell'

	// `useA11yRoving` runs unconditionally (rules of hooks); when `mode` is
	// `none` it's inert: `manageTabIndex` false skips the tab-stop effect, and
	// the caller drops the returned handler.
	const itemSelector = cellMode ? CELL_ITEM_SELECTOR : ROW_ITEM_SELECTOR

	const rovingKeyDown = useA11yRoving(tableRef, {
		itemSelector,
		orientation: 'vertical',
		manageTabIndex: mode !== 'none',
	})

	// The column of the last data cell that cell mode left, for a move through a
	// group header back to a data row.
	const colRef = useRef(0)

	// The keys of a group header, and the arrows of cell mode, go before the
	// roving hook. The hook takes the other keys, such as Home and End.
	const onKeyDown = useCallback(
		(event: KeyboardEvent<HTMLTableElement>) => {
			if (event.defaultPrevented) return

			const items = queryItems(event.currentTarget, itemSelector)

			const current = items.find((item) => item === document.activeElement)

			if (
				current &&
				!hasBrowserModifier(event) &&
				handleItemKey(event, items, current, cellMode, colRef)
			)
				return

			rovingKeyDown(event)
		},
		[itemSelector, cellMode, rovingKeyDown],
	)

	// The controls in the data rows leave the tab order, so the grid is one tab stop.
	useGridTabStops(tableRef, mode === 'none' ? null : GRID_ROW)

	return {
		mode,
		rovingRows: mode === 'row',
		rovingCells: cellMode,
		tableProps: mode === 'none' ? undefined : { onKeyDown },
	}
}
