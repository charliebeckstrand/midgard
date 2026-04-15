'use client'

import { useMemo } from 'react'
import { cn } from '../../core'
import { Checkbox } from '../checkbox'
import { TableCell, TableRow } from '../table'
import type { DataTableColumn } from './component'
import { type DataTableRowContextValue, DataTableRowProvider, useDataTable } from './context'
import { k } from './variants'

type DataTableRowInternalProps<T> = {
	row: T
	rowKey: string | number
	columns: DataTableColumn<T>[]
	loading: boolean
	className: string | undefined
}

export function DataTableRowInternal<T>({
	row,
	rowKey,
	columns,
	loading,
	className,
}: DataTableRowInternalProps<T>) {
	const { selection, toggleRow } = useDataTable()

	const selected = selection.has(rowKey)

	const rowCtx = useMemo<DataTableRowContextValue<T>>(
		() => ({ row, rowKey, selected, loading }),
		[row, rowKey, selected, loading],
	)

	return (
		<DataTableRowProvider value={rowCtx as DataTableRowContextValue}>
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

					return (
						<TableCell key={col.id} className={cn(col.className)}>
							{col.cell ? col.cell(row) : null}
						</TableCell>
					)
				})}
			</TableRow>
		</DataTableRowProvider>
	)
}
