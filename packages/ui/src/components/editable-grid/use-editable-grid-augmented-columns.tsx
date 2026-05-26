'use client'

import { type HTMLAttributes, type MouseEvent, useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/editable-grid'
import type { DataTableColumn } from '../data-table'
import { EditableGridCell } from './editable-grid-cell'
import { EditableGridTextEditor } from './editable-grid-text-editor'
import type { EditableGridColumn, EditableGridDraftApi, EditableGridNavigationApi } from './types'

type UseEditableGridAugmentedColumns<T> = {
	columns: EditableGridColumn<T>[]
	rowIndexMap: Map<T, number>
	nav: EditableGridNavigationApi
	draft: EditableGridDraftApi
	formatCell: (row: T, col: EditableGridColumn<T>) => string
}

export function useEditableGridAugmentedColumns<T>({
	columns,
	rowIndexMap,
	nav: { active, addCellToSelection, moveActiveTo },
	draft: { editing, beginEdit },
	formatCell,
}: UseEditableGridAugmentedColumns<T>): DataTableColumn<T>[] {
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

					const isActive = active?.row === rowIdx && active?.col === colIdx

					const showInput = isActive && editing && !readOnly

					return {
						role: 'gridcell',
						'aria-readonly': readOnly || undefined,
						onMouseDown: (e: MouseEvent<HTMLTableCellElement>) => {
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
	}, [
		columns,
		rowIndexMap,
		formatCell,
		active,
		editing,
		addCellToSelection,
		moveActiveTo,
		beginEdit,
	])
}
