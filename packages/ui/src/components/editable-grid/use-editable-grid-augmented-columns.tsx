'use client'

import { type HTMLAttributes, type MouseEvent, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/editable-grid'
import type { DataTableColumn } from '../data-table'
import { EditableGridCell } from './editable-grid-cell'
import { EditableGridTextEditor } from './editable-grid-text-editor'
import type { EditableGridColumn, EditableGridDraftApi, EditableGridNavigationApi } from './types'

type EditableGridAugmentedColumns<T> = {
	columns: EditableGridColumn<T>[]
	rowIndexMap: Map<T, number>
	nav: EditableGridNavigationApi
	draft: EditableGridDraftApi
	formatCell: (row: T, col: EditableGridColumn<T>) => string
	/** Derives a stable per-cell id (matched by the grid's `aria-activedescendant`). */
	cellId: (suffix: string) => string
}

export function useEditableGridAugmentedColumns<T>({
	columns,
	rowIndexMap,
	nav: { active, addCellToSelection, moveActiveTo },
	draft: { editing, beginEdit },
	formatCell,
	cellId,
}: EditableGridAugmentedColumns<T>): DataTableColumn<T>[] {
	// `cellProps` is a plain function, not a component; it reads `active` and
	// `editing` through refs at event time rather than closing over state values,
	// keeping them out of the memo deps. Stable column identities let memoized
	// DataTable rows hold; only the affected cell shells re-render via context.
	const activeRef = useRef(active)

	activeRef.current = active

	const editingRef = useRef(editing)

	editingRef.current = editing

	return useMemo<DataTableColumn<T>[]>(() => {
		let editableColIdx = 0

		return columns.map((col) => {
			if (col.selectable || col.actions) {
				return {
					id: col.id,
					title: col.title,
					sortable: col.sortable,
					selectable: col.selectable,
					actions: col.actions,
					width: col.width,
					className: col.className,
					headerClassName: col.headerClassName,
				}
			}

			const colIdx = editableColIdx++

			const align = col.align ?? 'left'

			const readOnly = col.readOnly ?? false

			const editor = col.editor ?? EditableGridTextEditor

			return {
				id: col.id,
				title: col.title,
				sortable: col.sortable,
				width: col.width,
				className: cn(k.cellTd, col.className),
				headerClassName: col.headerClassName,
				cellProps: (row: T): HTMLAttributes<HTMLTableCellElement> => {
					const rowIdx = rowIndexMap.get(row) ?? -1

					return {
						// Stable per-cell id that `aria-activedescendant` resolves to;
						// derived from position, not selection state, so it stays out of the memo.
						id: cellId(`cell-${rowIdx}-${colIdx}`),
						role: 'gridcell',
						'aria-readonly': readOnly || undefined,
						onMouseDown: (e: MouseEvent<HTMLTableCellElement>) => {
							const activeNow = activeRef.current

							const isActive = activeNow?.row === rowIdx && activeNow?.col === colIdx

							const showInput = isActive && editingRef.current && !readOnly

							if (showInput) return

							e.preventDefault()

							e.currentTarget.closest<HTMLElement>('[role=grid]')?.focus()

							const coord = { row: rowIdx, col: colIdx }

							if (e.metaKey || e.ctrlKey) addCellToSelection(coord)
							else moveActiveTo(coord, e.shiftKey)
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
						<EditableGridCell
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
