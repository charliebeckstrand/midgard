'use client'

import { memo, useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/data-table'
import { Checkbox } from '../checkbox'
import { TableCell, TableRow } from '../table'
import { DataTableRowContext, type DataTableRowContextValue } from './context'
import type { DataTableColumn } from './types'

type DataTableRowProps<T> = {
	row: T
	rowKey: string | number
	columns: DataTableColumn<T>[]
	loading: boolean
	className: string | undefined
	/**
	 * Passed as a prop (rather than read from `selection` in context) so the
	 * memoized row only re-renders when its own selected state flips — toggling
	 * one row in a large table no longer re-renders every other row.
	 */
	selected: boolean
	/** Stable reference from the selection hook, safe to pass through `memo`. */
	toggleRow: (key: string | number) => void
	/**
	 * 1-based position in the full row set (header = 1), set only when the body
	 * is virtualized so assistive tech can report position despite the windowed
	 * DOM. Omitted otherwise.
	 */
	rowIndex?: number
	/**
	 * 0-based index into the full `rows` array, surfaced as `data-row-index` so
	 * keyboard bridges (e.g. EditableGrid) can resolve a `<tr>` to its data row
	 * without relying on physical DOM position — which diverges from the data
	 * order once spacer rows and windowing enter the picture under virtualization.
	 */
	dataRowIndex: number
}

function DataTableRowImpl<T>({
	row,
	rowKey,
	columns,
	loading,
	className,
	selected,
	toggleRow,
	rowIndex,
	dataRowIndex,
}: DataTableRowProps<T>) {
	const rowContext = useMemo<DataTableRowContextValue<T>>(
		() => ({ row, rowKey, selected, loading }),
		[row, rowKey, selected, loading],
	)

	return (
		<DataTableRowContext value={rowContext}>
			<TableRow
				data-selected={selected || undefined}
				data-row-index={dataRowIndex}
				aria-rowindex={rowIndex}
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
