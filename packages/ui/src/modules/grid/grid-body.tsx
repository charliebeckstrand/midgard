import type { Table } from '@tanstack/react-table'
import type { ReactNode, RefObject } from 'react'
import { TableBody, TableEmpty, TableLoading } from '../../components/table'
import { GridRow } from './grid-row'
import { GridVirtualizedBody } from './grid-virtualized-body'
import type { GridColumn } from './types'

/** Props for {@link GridBody}. @internal */
type GridBodyProps<T> = {
	loading: boolean
	/** The engine; each row renders its cells from `table.getRow(key).getVisibleCells()`. */
	table: Table<T>
	rows: T[]
	rowKeys: (string | number)[]
	/** Visible columns, kept for the loading/empty column spans. */
	visibleColumns: GridColumn<T>[]
	getKey: (row: T, index: number) => string | number
	rowLoading?: (row: T) => boolean
	rowClassName?: (row: T) => string | undefined
	rowLabel?: (row: T) => string
	empty: ReactNode
	selection: Set<string | number>
	toggleRow: (key: string | number) => void
	/** Registers each non-pinned data cell against the column sortable for whole-column reorder drags. */
	reorderable: boolean
	/** Truncate overflowing cell content with an ellipsis and an on-hover tooltip. */
	truncate: boolean
	virtualize: {
		scrollRef: RefObject<HTMLDivElement | null>
		estimateSize: number
		overscan: number
	} | null
}

/**
 * Body for {@link Grid}: branches between the loading skeleton, the `empty`
 * slot, the virtualized window, and the plain row map, threading per-row state
 * to each {@link GridRow}.
 *
 * @internal
 */
export function GridBody<T>({
	loading,
	table,
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
	truncate,
	virtualize,
}: GridBodyProps<T>) {
	if (loading) return <TableLoading columns={visibleColumns.length} />

	if (rows.length === 0) return <TableEmpty columns={visibleColumns.length}>{empty}</TableEmpty>

	if (virtualize) {
		return (
			<GridVirtualizedBody<T>
				scrollRef={virtualize.scrollRef}
				table={table}
				rows={rows}
				rowKeys={rowKeys}
				visibleColumns={visibleColumns}
				rowLoading={rowLoading}
				rowClassName={rowClassName}
				rowLabel={rowLabel}
				selection={selection}
				toggleRow={toggleRow}
				reorderable={reorderable}
				truncate={truncate}
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
					<GridRow<T>
						key={key}
						cells={table.getRow(String(key)).getVisibleCells()}
						row={row}
						rowKey={key}
						loading={rowLoading?.(row) ?? false}
						className={rowClassName?.(row)}
						rowLabel={rowLabel?.(row)}
						selected={selection.has(key)}
						toggleRow={toggleRow}
						reorderable={reorderable}
						truncate={truncate}
						dataRowIndex={index}
					/>
				)
			})}
		</TableBody>
	)
}
