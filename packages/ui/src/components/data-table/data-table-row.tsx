'use client'

import { memo, useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/data-table'
import { Checkbox } from '../checkbox'
import { TableCell, TableRow } from '../table'
import { DataTableRowContext, type DataTableRowContextValue, useDataTable } from './context'
import type { DataTableColumn } from './types'

type DataTableRowProps<T> = {
	row: T
	rowKey: string | number
	columns: DataTableColumn<T>[]
	loading: boolean
	className: string | undefined
}

function DataTableRowImpl<T>({ row, rowKey, columns, loading, className }: DataTableRowProps<T>) {
	const { selection, toggleRow } = useDataTable()

	const selected = selection.has(rowKey)

	const rowContext = useMemo<DataTableRowContextValue<T>>(
		() => ({ row, rowKey, selected, loading }),
		[row, rowKey, selected, loading],
	)

	return (
		<DataTableRowContext value={rowContext}>
			<TableRow
				data-selected={selected || undefined}
				className={cn(loading && k.rowLoading, className)}
			>
				{columns.map((col) => {
					if (col.selectable) {
						return (
							<TableCell key={col.id} className={cn(k.selectCell, col.className)}>
								<Checkbox
									checked={selected}
									onChange={() => toggleRow(rowKey)}
									aria-label={`Select row ${rowKey}`}
								/>
							</TableCell>
						)
					}

					if (col.actions) {
						return (
							<TableCell key={col.id} className={cn(k.actionsCell, col.className)}>
								{col.actions(row)}
							</TableCell>
						)
					}

					const cellExtra = col.cellProps?.(row)

					return (
						<TableCell
							key={col.id}
							{...cellExtra}
							className={cn(col.className, cellExtra?.className)}
						>
							{col.cell ? col.cell(row) : null}
						</TableCell>
					)
				})}
			</TableRow>
		</DataTableRowContext>
	)
}

export const DataTableRow = memo(DataTableRowImpl) as typeof DataTableRowImpl
