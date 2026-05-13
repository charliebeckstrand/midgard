'use client'

import { useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/editable-grid'
import type { DataTableColumn } from '../data-table'
import { EditableGridCellContent } from './cell'
import type { EditableGridColumn } from './types'

type UseEditableGridAugmentedColumns<T> = {
	columns: EditableGridColumn<T>[]
	rowIndexMap: Map<T, number>
	formatCell: (row: T, col: EditableGridColumn<T>) => string
}

export function useEditableGridAugmentedColumns<T>({
	columns,
	rowIndexMap,
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

			return {
				id: col.id,
				title: col.title,
				sortable: col.sortable,
				width: col.width,
				className: cn(k.cellTd, col.className),
				headerClassName: col.headerClassName,
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
	}, [columns, rowIndexMap, formatCell])
}
