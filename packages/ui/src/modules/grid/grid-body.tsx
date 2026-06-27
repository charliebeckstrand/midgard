import type { Table } from '@tanstack/react-table'
import type { ReactNode, RefObject } from 'react'
import { Alert } from '../../components/alert'
import { TableBody, TableEmpty, TableLoading } from '../../components/table'
import { GridRow, type GridRowClick } from './grid-row'
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
	/** Stable per-row click handler; rows are inert when omitted. */
	onRowClick?: GridRowClick<T>
	empty: ReactNode
	/** Error-state node shown in place of the body; `true` for a default alert. Takes precedence over `empty`. */
	error: ReactNode
	/** When the rendered body is a window onto a larger set (virtualization/pagination), rows carry global `aria-rowindex`. */
	gridSemantics: boolean
	/** Global row-index base added to each rendered row's local index (the page offset under pagination, else 0). */
	rowIndexOffset: number
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
	onRowClick,
	empty,
	error,
	gridSemantics,
	rowIndexOffset,
	selection,
	toggleRow,
	reorderable,
	truncate,
	pinning,
	virtualize,
}: GridBodyProps<T>) {
	if (loading) return <TableLoading columns={visibleColumns.length} />

	// An error state pre-empts the empty slot: a failed fetch has no rows, but the
	// cause isn't "no items". `true` renders a default error alert.
	if (error != null && error !== false) {
		return (
			<TableEmpty columns={visibleColumns.length}>
				{error === true ? (
					<Alert severity="error" variant="soft" title="Couldn't load data" block />
				) : (
					error
				)}
			</TableEmpty>
		)
	}

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
				onRowClick={onRowClick}
				gridSemantics={gridSemantics}
				rowIndexOffset={rowIndexOffset}
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
						onRowClick={onRowClick}
						selected={selection.has(key)}
						toggleRow={toggleRow}
						reorderable={reorderable}
						truncate={truncate}
						pinning={pinning}
						dataRowIndex={index}
						// Header occupies row 1; data rows are offset by 2, plus the page
						// offset so a paginated row reports its place in the full set. Only
						// emitted under grid semantics (a plain table conveys it natively).
						rowIndex={gridSemantics ? rowIndexOffset + index + 2 : undefined}
					/>
				)
			})}
		</TableBody>
	)
}
