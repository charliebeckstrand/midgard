'use client'

import {
	type ComponentProps,
	type MouseEvent,
	type ReactNode,
	type RefObject,
	useMemo,
} from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'
import { isDataColumn } from '../../utilities'
import { isColumnEditable } from './engine/grid-editing-utilities'
import type { GridIndexedColumn } from './engine/grid-row/cell'
import { GridEditingCell } from './grid-editing-cell'
import { GridNavCell, seatingCellProps } from './grid-nav-cell'
import type { GridColumn } from './types'
import type { Coord } from './use-grid-navigation'
import type { GridTouchEntry } from './use-grid-touch-entry'

/**
 * Projects the data columns of a grid with a cursor into cursor columns. Each
 * gains a stable per-cell id, matched by the grid's `aria-activedescendant`,
 * `role="gridcell"`, and a click-to-seat `onMouseDown`.
 *
 * The content of a cell is the active-cell marker around the column's own
 * content. Under `editing`, an editable column renders through
 * {@link GridEditingCell} instead: the column's display value, or its editor
 * when the session has the cell open. A column that cannot edit says so with
 * `aria-readonly`, and renders as a navigable cell does.
 *
 * A flat row gives each cell its place in the view (`cellAt`, `cellPropsAt`); a
 * body with no place to give reads it from `rowIndexMapRef`. The column index
 * and the row key resolve at render time, so the columns stay referentially
 * stable across cursor moves and edits, and the memoized rows hold. The
 * non-data columns (selection, actions, drag handle, expander), and a grid with
 * no cursor (`enabled` false), pass through untouched.
 *
 * The closures read the refs inline. A helper that took them would read a ref
 * during render, and the compiler would skip the hook.
 *
 * @returns The augmented `GridColumn<T>[]` to feed the engine.
 * @internal
 */
export function useGridCursorColumns<T>({
	enabled,
	editing,
	columns,
	rowIndexMapRef,
	colIndexMapRef,
	rowKeysRef,
	cellId,
	seat,
	touch,
}: {
	/** Whether the grid carries a cursor. */
	enabled: boolean
	/** Whether the grid is editable, which mounts the editors. */
	editing: boolean
	columns: GridColumn<T>[]
	/** Live row → display-index map; resolves a cell's cursor row. */
	rowIndexMapRef: RefObject<Map<T, number>>
	/** Live column-id → display-data-index map; resolves a cell's cursor column. */
	colIndexMapRef: RefObject<Map<string | number, number>>
	/** Live display-order row keys; resolves a cell's row key for the open-editor test. */
	rowKeysRef: RefObject<(string | number)[]>
	cellId: (row: number, col: number) => string
	/** Seats the cursor on a pressed cell (see `useGridNavigation`). */
	seat: (coord: Coord, event: MouseEvent<HTMLElement>) => void
	/**
	 * Opens the active cell on a tap, under a grid-owned session (see
	 * {@link useGridTouchEntry}). Only an editable cell gets it.
	 */
	touch: GridTouchEntry | undefined
}): GridColumn<T>[] {
	return useMemo(() => {
		if (!enabled) return columns

		const indexOf = (row: T) => rowIndexMapRef.current.get(row) ?? -1

		const colOf = (id: string | number) => colIndexMapRef.current.get(id) ?? -1

		return columns.map((col): GridIndexedColumn<T> => {
			if (!isDataColumn(col)) return col

			const renderCell = col.cell

			const editable = editing && isColumnEditable(col)

			// Under editing, a cell that cannot enter edit mode says so, whether
			// `readOnly` locks it or it has no field and no slot (WCAG 4.1.2).
			const extra = editing ? { 'aria-readonly': !editable || undefined } : undefined

			// A cell that cannot edit holds no draft and no editor, so it renders as
			// a navigable cell does, and the edit store does not reach it.
			const cellAt = editable
				? (row: T, rowIdx: number): ReactNode => (
						<GridEditingCell
							rowIdx={rowIdx}
							colIdx={colOf(col.id)}
							rowKey={rowKeysRef.current[rowIdx] ?? rowIdx}
							row={row}
							column={col}
							render={renderCell}
						/>
					)
				: (row: T, rowIdx: number): ReactNode => (
						<GridNavCell row={rowIdx} col={colOf(col.id)}>
							{renderCell?.(row)}
						</GridNavCell>
					)

			const cellPropsAt = (row: T, rowIdx: number): ComponentProps<'td'> =>
				seatingCellProps({
					col,
					row,
					rowIdx,
					colIndexMapRef,
					cellId,
					seat,
					extra,
					touch: editable ? touch : undefined,
				})

			return {
				...col,
				className: cn(k.nav.cell, col.className),
				cellAt,
				cellPropsAt,
				cellProps: (row: T) => cellPropsAt(row, indexOf(row)),
				cell: (row: T) => cellAt(row, indexOf(row)),
			}
		})
	}, [enabled, editing, columns, rowIndexMapRef, colIndexMapRef, rowKeysRef, cellId, seat, touch])
}
