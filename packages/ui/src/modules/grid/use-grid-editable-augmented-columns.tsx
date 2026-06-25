'use client'

import { type HTMLAttributes, type MouseEvent, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid-editable'
import { isDataColumn } from '../../utilities'
import { GridEditableCell } from './grid-editable-cell'
import { GridEditableTextEditor } from './grid-editable-text-editor'
import type {
	GridEditableColumn,
	GridEditableDraftApi,
	GridEditableNavigationApi,
} from './grid-editable-types'
import type { GridColumn } from './types'

type GridEditableAugmentedColumns<T> = {
	columns: GridEditableColumn<T>[]
	rowIndexMap: Map<T, number>
	nav: GridEditableNavigationApi
	draft: GridEditableDraftApi
	formatCell: (row: T, col: GridEditableColumn<T>) => string
	/** Derives a stable per-cell id (matched by the grid's `aria-activedescendant`). */
	cellId: (suffix: string) => string
}

/**
 * Projects {@link GridEditableColumn}s into plain `GridColumn`s, attaching
 * the grid's per-cell behaviour: a `cell` renderer mounting {@link GridEditableCell}
 * and `cellProps` carrying the `role="gridcell"` / `aria-readonly` / stable cell
 * id plus mouse handlers (click to move or extend, Ctrl-click to add, double-click
 * to edit). Non-data columns (select / actions) pass through untouched.
 *
 * @returns The augmented `GridColumn<T>[]` to hand to `Grid`.
 * @remarks `cellProps` reads `active`/`editing` through refs at event time, so
 *   column identities stay stable across navigation and memoized `Grid`
 *   rows hold; only the affected cell shells re-render via context.
 * @internal
 */
export function useGridEditableAugmentedColumns<T>({
	columns,
	rowIndexMap,
	nav: { active, addCellToSelection, moveActiveTo },
	draft: { editing, beginEdit },
	formatCell,
	cellId,
}: GridEditableAugmentedColumns<T>): GridColumn<T>[] {
	// `cellProps` is a plain function, not a component; it reads `active` and
	// `editing` through refs at event time rather than closing over state values,
	// keeping them out of the memo deps. Stable column identities let memoized
	// Grid rows hold; only the affected cell shells re-render via context.
	const activeRef = useRef(active)

	activeRef.current = active

	const editingRef = useRef(editing)

	editingRef.current = editing

	return useMemo<GridColumn<T>[]>(() => {
		let editableColIdx = 0

		return columns.map((col) => {
			// Separate the edit-only fields; `base` carries the GridColumn fields.
			const {
				field,
				format,
				parse,
				editor: colEditor,
				readOnly: colReadOnly,
				align: colAlign,
				...base
			} = col

			if (!isDataColumn(col)) return base

			const colIdx = editableColIdx++

			const align = colAlign ?? 'left'

			const readOnly = colReadOnly ?? false

			const editor = colEditor ?? GridEditableTextEditor

			return {
				...base,
				className: cn(k.cellTd, col.className),
				cellProps: (row: T): HTMLAttributes<HTMLTableCellElement> => {
					const rowIdx = rowIndexMap.get(row) ?? -1

					return {
						// Stable per-cell id that `aria-activedescendant` resolves to;
						// derived from position, not selection state, and out of the memo.
						id: cellId(`cell-${rowIdx}-${colIdx}`),
						role: 'gridcell',
						'aria-readonly': readOnly || undefined,
						onMouseDown: (event: MouseEvent<HTMLTableCellElement>) => {
							const activeNow = activeRef.current

							const isActive = activeNow?.row === rowIdx && activeNow?.col === colIdx

							const showInput = isActive && editingRef.current && !readOnly

							if (showInput) return

							event.preventDefault()

							event.currentTarget.closest<HTMLElement>('[role=grid]')?.focus()

							const coord = { row: rowIdx, col: colIdx }

							if (event.metaKey || event.ctrlKey) addCellToSelection(coord)
							else moveActiveTo(coord, event.shiftKey)
						},
						onDoubleClick: () => {
							if (readOnly) return

							beginEdit({ row: rowIdx, col: colIdx }, formatCell(row, col))
						},
					}
				},
				cell: (row: T) => {
					const rowIdx = rowIndexMap.get(row) ?? -1

					const formatted = formatCell(row, col)

					return (
						<GridEditableCell
							rowIdx={rowIdx}
							colIdx={colIdx}
							readOnly={readOnly}
							align={align}
							formatted={formatted}
							row={row}
							column={col}
							editor={editor}
						/>
					)
				},
			}
		})
	}, [columns, rowIndexMap, formatCell, addCellToSelection, moveActiveTo, beginEdit, cellId])
}
