'use client'

import { type HTMLAttributes, type MouseEvent, useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/editable-grid'
import type { DataTableColumn } from '../data-table'
import { EditableGridCellContent } from './cell'
import type { Coord, EditableGridColumn } from './types'

type UseEditableGridAugmentedColumns<T> = {
	columns: EditableGridColumn<T>[]
	rowIndexMap: Map<T, number>
	formatCell: (row: T, col: EditableGridColumn<T>) => string
	active: Coord | null
	editing: boolean
	addCellToSelection: (coord: Coord) => void
	moveActiveTo: (coord: Coord, extend?: boolean) => void
	beginEdit: (coord: Coord, initial?: string, original?: string) => void
}

export function useEditableGridAugmentedColumns<T>({
	columns,
	rowIndexMap,
	formatCell,
	active,
	editing,
	addCellToSelection,
	moveActiveTo,
	beginEdit,
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
						<EditableGridCellContent
							rowIdx={rowIdx}
							colIdx={colIdx}
							readOnly={readOnly}
							align={align}
							formatted={formatted}
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
