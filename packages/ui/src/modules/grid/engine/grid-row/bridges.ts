import type { KeyboardEvent, RefObject } from 'react'
import { isDataColumn } from '../../../../utilities/is-data-column'
import type { GridColumn } from '../../types'
import {
	cellContext,
	type GridCellClick,
	type GridCellClickContext,
	type GridCellRovingActivate,
	type GridRowClick,
} from './cell'

/**
 * Activates the row under the cursor on Enter/Space. The originating event is
 * the grid `<table>` (the cursor's single tab stop), not a `<tr>`. This is
 * therefore decoupled from the grid's row-click handler, and `Grid` bridges the
 * two.
 *
 * @internal
 */
export type GridRowActivate = (row: unknown, event: KeyboardEvent<HTMLTableElement>) => void

/**
 * Activates the data cell under the cursor on Enter/Space, ahead of the row
 * activation. It is the keyboard counterpart of the grid's cell click,
 * addressed by the cursor's display-index coord. `Grid` resolves it to the cell
 * context.
 *
 * @internal
 */
export type GridCellActivate = (
	rowIndex: number,
	colIndex: number,
	event: KeyboardEvent<HTMLTableElement>,
) => void

/**
 * The four click handlers of a grid: the cell and row click, and the cell and
 * row double-click. Any one of them makes a row clickable.
 *
 * @internal
 */
export type GridClickHandlers<T> = {
	onCellClick?: GridCellClick<T> | undefined
	onRowClick?: GridRowClick<T> | undefined
	onCellDoubleClick?: GridCellClick<T> | undefined
	onRowDoubleClick?: GridRowClick<T> | undefined
}

/**
 * Adapts the row handlers into the cursor's `onRowActivate`. The cursor fires
 * from the grid `<table>`, its single tab stop. The row-level event type is
 * therefore bridged to the table-level one here. The key picks the handler
 * (see {@link keyboardActivation}). `undefined` when the grid has no row click
 * and no row double-click.
 *
 * @internal
 */
export function bridgeRowActivate<T>(handlers: GridClickHandlers<T>): GridRowActivate | undefined {
	if (!handlers.onRowClick && !handlers.onRowDoubleClick) return undefined

	return (row, event) =>
		keyboardActivation(handlers, event.key).onRow?.(
			row as T,
			event as unknown as Parameters<GridRowClick<T>>[1],
		)
}

/**
 * Adapts the cell handlers into the cursor's `onCellActivate`. The cursor speaks
 * display indices, so the bridge resolves them to the cell context through the
 * live refs at activation time. That context is the row datum, key, data column,
 * and value. The key picks the handler (see {@link keyboardActivation}).
 * `undefined` when the grid has no cell click and no cell double-click.
 *
 * @internal
 */
export function bridgeCellActivate<T>(
	handlers: GridClickHandlers<T>,
	refs: {
		rowsRef: RefObject<readonly T[]>
		rowKeysRef: RefObject<(string | number)[]>
		cursorColumnsRef: RefObject<GridColumn<T>[]>
	},
): GridCellActivate | undefined {
	if (!handlers.onCellClick && !handlers.onCellDoubleClick) return undefined

	return (rowIndex, colIndex, event) => {
		const onCell = keyboardActivation(handlers, event.key).onCell

		const cell = onCell && resolveCellAt(refs, rowIndex, colIndex)

		if (cell) onCell(cell, event)
	}
}

/**
 * Resolves a display coordinate to the cell context every channel names a cell by.
 *
 * Shared by the keyboard activation above and the cursor's own report, because the
 * two must agree. They use the same guard, the same `value` accessor, and the
 * same payload. A
 * coordinate the engine cannot resolve (a row or column that moved out from under
 * it) yields `null` and the caller stays quiet.
 *
 * @internal
 */
export function resolveCellAt<T>(
	refs: {
		rowsRef: RefObject<readonly T[]>
		rowKeysRef: RefObject<(string | number)[]>
		cursorColumnsRef: RefObject<GridColumn<T>[]>
	},
	rowIndex: number,
	colIndex: number,
): GridCellClickContext<T> | null {
	const row = refs.rowsRef.current[rowIndex]

	const rowKey = refs.rowKeysRef.current[rowIndex]

	const col = refs.cursorColumnsRef.current[colIndex]

	// A cell of a column that holds no row content, such as the selection or
	// the actions column, names no cell, as a press on it names none.
	if (row === undefined || rowKey === undefined || !col || !isDataColumn(col)) return null

	return cellContext(col, row, rowKey)
}

/**
 * The pair of handlers that an activation key fires: the cell handler, then
 * the row handler. Space fires the click pair, and Enter fires the
 * double-click pair, as in a file manager, where a click selects and a
 * double-click opens. When the grid has no handler in the pair of the key, the
 * key fires the other pair. Thus an action that only a double-click starts has
 * a keyboard route (WCAG 2.1.1), and so does an action that only a click
 * starts. It is one rule for the keyboard cursor, for roving, and for the row
 * shell.
 *
 * @internal
 */
export function keyboardActivation<T>(
	handlers: GridClickHandlers<T>,
	key: string,
): { onCell: GridCellClick<T> | undefined; onRow: GridRowClick<T> | undefined } {
	const click = { onCell: handlers.onCellClick, onRow: handlers.onRowClick }

	const doubleClick = { onCell: handlers.onCellDoubleClick, onRow: handlers.onRowDoubleClick }

	const [own, other] = key === 'Enter' ? [doubleClick, click] : [click, doubleClick]

	return own.onCell || own.onRow ? own : other
}

/**
 * Builds the cell-roving activation. A focused cell's Enter/Space fires the
 * cell handler then the row handler of {@link keyboardActivation}. That is the
 * order a pointer click on the cell fires them in. `undefined` when the grid
 * has no handler. Kept off {@link GridData}'s complexity budget.
 *
 * @internal
 */
export function buildRovingCellActivate<T>(
	handlers: GridClickHandlers<T>,
): GridCellRovingActivate<T> | undefined {
	const { onCellClick, onRowClick, onCellDoubleClick, onRowDoubleClick } = handlers

	if (!onCellClick && !onRowClick && !onCellDoubleClick && !onRowDoubleClick) return undefined

	return (context, event) => {
		const { onCell, onRow } = keyboardActivation(handlers, event.key)

		onCell?.(context, event)

		// The activation fires from the cell's `<td>`, so the event's element type
		// is widened to the row-click's `<tr>` signature, as the cursor bridge
		// does.
		onRow?.(context.row, event as unknown as Parameters<GridRowClick<T>>[1])
	}
}

/**
 * Composes the grid's own cell double-click intent (double-click-to-edit, see
 * {@link GridEditableConfig.session}) with the consumer's handler on the one
 * built-in event. The internal intent fires first, then the consumer is
 * notified. Either alone passes through untouched; `undefined` when neither is
 * set, so an inert row attaches no handler.
 *
 * @internal
 */
export function composeCellDoubleClick<T>(
	internal: GridCellClick<T> | undefined,
	consumer: GridCellClick<T> | undefined,
): GridCellClick<T> | undefined {
	if (!internal || !consumer) return internal ?? consumer

	return (cell, event) => {
		internal(cell, event)

		consumer(cell, event)
	}
}
