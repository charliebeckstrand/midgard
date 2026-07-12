import type { RefObject } from 'react'
import type { GridColumn } from '../../types'
import type { GridCellActivate, GridRowActivate } from '../../use-grid-navigation'
import {
	cellValue,
	type GridCellClick,
	type GridCellRovingActivate,
	type GridRowClick,
} from './cell'

/**
 * Adapts the row-click into the cursor's `onRowActivate`: the cursor fires from
 * the grid `<table>` (its single tab stop), so the row-level event type is bridged
 * to the table-level one here. `undefined` when the grid has no row click.
 *
 * @internal
 */
export function bridgeRowActivate<T>(
	handleRowClick: GridRowClick<T> | undefined,
): GridRowActivate | undefined {
	if (!handleRowClick) return undefined

	return (row, event) =>
		handleRowClick(row as T, event as unknown as Parameters<GridRowClick<T>>[1])
}

/**
 * Adapts the cell-click into the cursor's `onCellActivate`: the cursor speaks
 * display indices, so the bridge resolves them to the cell context — row datum,
 * key, data column, and value — through the live refs at activation time.
 * `undefined` when the grid has no cell click.
 *
 * @internal
 */
export function bridgeCellActivate<T>(
	handleCellClick: GridCellClick<T> | undefined,
	refs: {
		rowsRef: RefObject<T[]>
		rowKeysRef: RefObject<(string | number)[]>
		dataColumnsRef: RefObject<GridColumn<T>[]>
	},
): GridCellActivate | undefined {
	if (!handleCellClick) return undefined

	return (rowIdx, colIdx, event) => {
		const row = refs.rowsRef.current[rowIdx]

		const rowKey = refs.rowKeysRef.current[rowIdx]

		const col = refs.dataColumnsRef.current[colIdx]

		if (row === undefined || rowKey === undefined || !col) return

		handleCellClick({ row, rowKey, columnId: col.id, value: cellValue(col, row) }, event)
	}
}

/**
 * Builds the cell-roving activation: a focused cell's Enter/Space fires the cell
 * click then the row click, the order (and pair) a pointer click on the cell
 * fires them in. `undefined` when the grid has neither handler. Kept off
 * {@link GridData}'s complexity budget. @internal
 */
export function buildRovingCellActivate<T>(
	handleCellClick: GridCellClick<T> | undefined,
	handleRowClick: GridRowClick<T> | undefined,
): GridCellRovingActivate<T> | undefined {
	if (!handleCellClick && !handleRowClick) return undefined

	return (context, event) => {
		handleCellClick?.(context, event)

		// The activation fires from the cell's `<td>`, so the event's element type
		// is widened to the row-click's `<tr>` signature — as the cursor bridge does.
		handleRowClick?.(context.row, event as unknown as Parameters<GridRowClick<T>>[1])
	}
}

/**
 * Composes the grid's own cell double-click intent (double-click-to-edit, see
 * {@link GridEditableConfig.trigger}) with the consumer's handler on the one
 * built-in event: the internal intent fires first, then the consumer is
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
