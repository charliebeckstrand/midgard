'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import type { RefObject } from 'react'
import { TableBody } from '../table'
import { DataTableRowInternal } from './row'
import type { DataTableColumn } from './types'

type DataTableVirtualizedBodyProps<T> = {
	scrollRef: RefObject<HTMLDivElement | null>
	rows: T[]
	rowKeys: (string | number)[]
	visibleColumns: DataTableColumn<T>[]
	rowLoading?: (row: T) => boolean
	rowClassName?: (row: T) => string | undefined
	estimateSize: number
	overscan: number
}

export function DataTableVirtualizedBody<T>({
	scrollRef,
	rows,
	rowKeys,
	visibleColumns,
	rowLoading,
	rowClassName,
	estimateSize,
	overscan,
}: DataTableVirtualizedBodyProps<T>) {
	const virtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => estimateSize,
		overscan,
	})

	const virtualItems = virtualizer.getVirtualItems()

	const totalSize = virtualizer.getTotalSize()

	const topSpacer = virtualItems[0]?.start ?? 0

	const lastItem = virtualItems[virtualItems.length - 1]

	const bottomSpacer = lastItem ? totalSize - lastItem.end : 0

	return (
		<TableBody>
			{topSpacer > 0 && (
				<tr data-slot="data-table-spacer">
					<td
						colSpan={visibleColumns.length}
						style={{ height: topSpacer, padding: 0, border: 0 }}
					/>
				</tr>
			)}
			{virtualItems.map((vr) => {
				const row = rows[vr.index] as T
				const key = rowKeys[vr.index] as string | number

				return (
					<DataTableRowInternal<T>
						key={key}
						row={row}
						rowKey={key}
						columns={visibleColumns}
						loading={rowLoading?.(row) ?? false}
						className={rowClassName?.(row)}
					/>
				)
			})}
			{bottomSpacer > 0 && (
				<tr data-slot="data-table-spacer">
					<td
						colSpan={visibleColumns.length}
						style={{ height: bottomSpacer, padding: 0, border: 0 }}
					/>
				</tr>
			)}
		</TableBody>
	)
}
