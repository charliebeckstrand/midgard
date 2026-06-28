'use client'

import {
	type HTMLAttributes,
	type MouseEvent,
	type ReactNode,
	type RefObject,
	useMemo,
} from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'
import { isDataColumn } from '../../utilities'
import { GridEditingCell } from './grid-editing-cell'
import { fromInteractiveContent } from './grid-row'
import type { GridColumn } from './types'
import type { Coord } from './use-grid-navigation'

/**
 * Projects an editable grid's data columns into editing-aware ones: each gains
 * the cursor wiring (a stable per-cell id, `role="gridcell"`, click-to-seat), and
 * its content renders through {@link GridEditingCell} — the column's display
 * value, or its editor when the cell's row is in edit mode. Display-order indices
 * and the row key resolve from the live maps at cell-render time, so the columns
 * stay referentially stable across cursor moves and edits. Select/actions
 * columns, and a non-editable grid (`enabled` false), pass through untouched.
 *
 * @returns The augmented `GridColumn<T>[]` to feed the engine.
 * @internal
 */
export function useGridEditingColumns<T>({
	enabled,
	columns,
	rowIndexMapRef,
	colIndexMapRef,
	rowKeysRef,
	cellId,
	moveTo,
}: {
	enabled: boolean
	columns: GridColumn<T>[]
	/** Live row → display-index map; resolves a cell's cursor row. */
	rowIndexMapRef: RefObject<Map<T, number>>
	/** Live column-id → display-data-index map; resolves a cell's cursor column. */
	colIndexMapRef: RefObject<Map<string | number, number>>
	/** Live display-order row keys; resolves a cell's row key for the editable-set test. */
	rowKeysRef: RefObject<(string | number)[]>
	cellId: (row: number, col: number) => string
	moveTo: (coord: Coord) => void
}): GridColumn<T>[] {
	return useMemo(() => {
		if (!enabled) return columns

		return columns.map((col) => {
			if (!isDataColumn(col)) return col

			const renderCell = col.cell

			const consumerProps = col.cellProps

			return {
				...col,
				className: cn(k.nav.cell, col.className),
				cellProps: (row: T): HTMLAttributes<HTMLTableCellElement> => {
					const rowIdx = rowIndexMapRef.current.get(row) ?? -1

					const colIdx = colIndexMapRef.current.get(col.id) ?? -1

					const prev = consumerProps?.(row)

					return {
						...prev,
						id: cellId(rowIdx, colIdx),
						role: 'gridcell',
						'aria-readonly': col.readOnly || undefined,
						onMouseDown: (event: MouseEvent<HTMLTableCellElement>) => {
							// Defer to focusable cell content (the row's editors, action
							// buttons, links); otherwise seat the cursor here and focus the grid.
							if (!fromInteractiveContent(event.target)) {
								event.currentTarget.closest<HTMLElement>('[role="grid"]')?.focus()

								moveTo({ row: rowIdx, col: colIdx })
							}

							prev?.onMouseDown?.(event)
						},
					}
				},
				cell: (row: T): ReactNode => {
					const rowIdx = rowIndexMapRef.current.get(row) ?? -1

					const colIdx = colIndexMapRef.current.get(col.id) ?? -1

					const rowKey = rowKeysRef.current[rowIdx] ?? rowIdx

					return (
						<GridEditingCell
							rowIdx={rowIdx}
							colIdx={colIdx}
							rowKey={rowKey}
							row={row}
							column={col}
							render={renderCell}
						/>
					)
				},
			}
		})
	}, [enabled, columns, rowIndexMapRef, colIndexMapRef, rowKeysRef, cellId, moveTo])
}
