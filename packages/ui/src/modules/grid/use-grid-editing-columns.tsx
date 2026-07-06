'use client'

import { type HTMLAttributes, type ReactNode, type RefObject, useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'
import { isDataColumn } from '../../utilities'
import { GridEditingCell } from './grid-editing-cell'
import type { GridColumn } from './types'
import type { Coord } from './use-grid-navigation'
import { seatingCellProps } from './use-grid-navigation-columns'

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

			return {
				...col,
				className: cn(k.nav.cell, col.className),
				cellProps: (row: T): HTMLAttributes<HTMLTableCellElement> =>
					seatingCellProps({
						col,
						row,
						rowIndexMapRef,
						colIndexMapRef,
						cellId,
						moveTo,
						// Editable cells expose their read-only state programmatically.
						extra: { 'aria-readonly': col.readOnly || undefined },
					}),
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
