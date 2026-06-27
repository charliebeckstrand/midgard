import type { Table } from '@tanstack/react-table'
import type { ReactNode, RefObject } from 'react'
import { TableBody, TableEmpty, TableLoading } from '../../components/table'
import { GridRow } from './grid-row'
import { GridVirtualizedBody } from './grid-virtualized-body'
import type { GridColumn } from './types'
import type { GridColumnPinning } from './use-grid-table'

/** Props for {@link GridBody}. @internal */
type GridBodyProps<T> = {
	loading: boolean
	/** The engine; rows read their cells from it. */
	table: Table<T>
	rows: T[]
	rowKeys: (string | number)[]
	/** Visible columns, kept for the loading/empty column spans. */
	visibleColumns: GridColumn<T>[]
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
	/** Frozen-column controls; pinned cells stick to an edge. `null` when none. */
	pinning: GridColumnPinning | null
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
	rowLoading,
	rowClassName,
	rowLabel,
	empty,
	selection,
	toggleRow,
	reorderable,
	truncate,
	pinning,
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
				pinning={pinning}
				estimateSize={virtualize.estimateSize}
				overscan={virtualize.overscan}
			/>
		)
	}

	return (
		<TableBody>
			{rows.map((row, index) => {
				// `rowKeys` is built parallel to `rows` (see `Grid`), so the index is
				// always present; the cast mirrors the virtualized body's row lookup.
				const key = rowKeys[index] as string | number

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
						pinning={pinning}
						dataRowIndex={index}
					/>
				)
			})}
		</TableBody>
	)
}
