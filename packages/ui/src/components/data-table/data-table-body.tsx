import type { ReactNode, RefObject } from 'react'
import { TableBody, TableEmpty, TableLoading } from '../table'
import { DataTableRow } from './data-table-row'
import { DataTableVirtualizedBody } from './data-table-virtualized-body'
import type { DataTableColumn } from './types'

type DataTableBodyProps<T> = {
	loading: boolean
	rows: T[]
	rowKeys: (string | number)[]
	visibleColumns: DataTableColumn<T>[]
	getKey: (row: T, index: number) => string | number
	rowLoading?: (row: T) => boolean
	rowClassName?: (row: T) => string | undefined
	empty: ReactNode
	virtualize: {
		scrollRef: RefObject<HTMLDivElement | null>
		estimateSize: number
		overscan: number
	} | null
}

export function DataTableBody<T>({
	loading,
	rows,
	rowKeys,
	visibleColumns,
	getKey,
	rowLoading,
	rowClassName,
	empty,
	virtualize,
}: DataTableBodyProps<T>) {
	if (loading) return <TableLoading columns={visibleColumns.length} />

	if (rows.length === 0) return <TableEmpty columns={visibleColumns.length}>{empty}</TableEmpty>

	if (virtualize) {
		return (
			<DataTableVirtualizedBody<T>
				scrollRef={virtualize.scrollRef}
				rows={rows}
				rowKeys={rowKeys}
				visibleColumns={visibleColumns}
				rowLoading={rowLoading}
				rowClassName={rowClassName}
				estimateSize={virtualize.estimateSize}
				overscan={virtualize.overscan}
			/>
		)
	}

	return (
		<TableBody>
			{rows.map((row, index) => {
				const key = rowKeys[index] ?? getKey(row, index)

				return (
					<DataTableRow<T>
						key={key}
						row={row}
						rowKey={key}
						columns={visibleColumns}
						loading={rowLoading?.(row) ?? false}
						className={rowClassName?.(row)}
					/>
				)
			})}
		</TableBody>
	)
}
