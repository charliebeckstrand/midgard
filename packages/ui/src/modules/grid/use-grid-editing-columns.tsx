'use client'

import { type ComponentProps, type ReactNode, type RefObject, useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'
import { isDataColumn } from '../../utilities'
import { isColumnEditable } from './engine/grid-editing-utilities'
import type { GridIndexedColumn } from './engine/grid-row/cell'
import { GridEditingCell } from './grid-editing-cell'
import type { GridColumn } from './types'
import type { Coord } from './use-grid-navigation'
import { seatingCellProps } from './use-grid-navigation-columns'

/**
 * Projects an editable grid's data columns into editing-aware ones: each gains
 * the cursor wiring (a stable per-cell id, `role="gridcell"`, click-to-seat).
 * Its content renders through {@link GridEditingCell}: the column's display
 * value, or its editor when the session has the cell open. A flat row gives each
 * cell its place in the view; a body with no place to give reads it from the
 * live map. The row key and the column index resolve at cell-render time, so the
 * columns stay referentially stable across cursor moves and edits. The non-data columns
 * (selection, actions, drag handle, expander), and a non-editable grid (`enabled` false), pass through untouched.
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
	/** Live display-order row keys; resolves a cell's row key for the open-editor test. */
	rowKeysRef: RefObject<(string | number)[]>
	cellId: (row: number, col: number) => string
	moveTo: (coord: Coord) => void
}): GridColumn<T>[] {
	return useMemo(() => {
		if (!enabled) return columns

		const indexOf = (row: T) => rowIndexMapRef.current.get(row) ?? -1

		return columns.map((col): GridIndexedColumn<T> => {
			if (!isDataColumn(col)) return col

			const renderCell = col.cell

			// A cell that cannot enter edit mode says so, whether `readOnly` locks it
			// or it has no field and no slot (WCAG 4.1.2).
			const extra = { 'aria-readonly': !isColumnEditable(col) || undefined }

			const cellAt = (row: T, rowIdx: number): ReactNode => (
				<GridEditingCell
					rowIdx={rowIdx}
					colIdx={colIndexMapRef.current.get(col.id) ?? -1}
					rowKey={rowKeysRef.current[rowIdx] ?? rowIdx}
					row={row}
					column={col}
					render={renderCell}
				/>
			)

			const cellPropsAt = (row: T, rowIdx: number): ComponentProps<'td'> =>
				seatingCellProps({ col, row, rowIdx, colIndexMapRef, cellId, moveTo, extra })

			return {
				...col,
				className: cn(k.nav.cell, col.className),
				cellAt,
				cellPropsAt,
				cellProps: (row: T) => cellPropsAt(row, indexOf(row)),
				cell: (row: T) => cellAt(row, indexOf(row)),
			}
		})
	}, [enabled, columns, rowIndexMapRef, colIndexMapRef, rowKeysRef, cellId, moveTo])
}
