import type { ReactNode, RefObject } from 'react'
import { TableBody, TableEmpty, TableLoading } from '../table'
import { DataTableRow } from './data-table-row'
import { DataTableVirtualizedBody } from './data-table-virtualized-body'
import type { DataTableColumn } from './types'

/** Props for {@link DataTableBody}. @internal */
type DataTableBodyProps<T> = {
	loading: boolean
	rows: T[]
	rowKeys: (string | number)[]
	visibleColumns: DataTableColumn<T>[]
	getKey: (row: T, index: number) => string | number
	rowLoading?: (row: T) => boolean
	rowClassName?: (row: T) => string | undefined
	rowLabel?: (row: T) => string
	empty: ReactNode
	selection: Set<string | number>
	toggleRow: (key: string | number) => void
	/** Registers each non-pinned data cell against the column sortable for whole-column reorder drags. */
	reorderable: boolean
	virtualize: {
		scrollRef: RefObject<HTMLDivElement | null>
		estimateSize: number
		overscan: number
	} | null
}

/**
 * Body for {@link DataTable}: branches between the loading skeleton, the `empty`
 * slot, the virtualized window, and the plain row map, threading per-row state
 * to each {@link DataTableRow}.
 *
 * @internal
 */
export function DataTableBody<T>({
	loading,
	rows,
	rowKeys,
	visibleColumns,
	getKey,
	rowLoading,
	rowClassName,
	rowLabel,
	empty,
	selection,
	toggleRow,
	reorderable,
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
				rowLabel={rowLabel}
				selection={selection}
				toggleRow={toggleRow}
				reorderable={reorderable}
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
						rowLabel={rowLabel?.(row)}
						selected={selection.has(key)}
						toggleRow={toggleRow}
						reorderable={reorderable}
						dataRowIndex={index}
					/>
				)
			})}
		</TableBody>
	)
}
