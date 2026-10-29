'use client'

import { TableCell } from '../../components/table'
import { cn } from '../../core'
import { useLocale } from '../../providers/locale'
import { k } from '../../recipes/kata/grid'
import { renderAggregate } from './engine/grid-aggregate'
import { NO_ROWS } from './engine/grid-constants'
import { pinnedCellProps } from './engine/grid-pin/styles'
import type { GridColumn } from './types'
import type { GridColumnPinning } from './use-grid-table'

/** Props for {@link GridAggregateCells}. @internal */
type GridAggregateCellsProps<T> = {
	/** The visible columns, in render order. */
	columns: GridColumn<T>[]
	/** The rows behind the aggregates; omitted on the manual path. */
	rows?: readonly T[]
	/** A manual group-header row carrying backend aggregates, read instead of computing over rows. */
	headerRow?: T
	/** The first column index to render: the cells after the row's label span. */
	from: number
	/**
	 * Renders the cells without figures. An expanded group header whose total row shows them takes it, so each figure shows once.
	 * @defaultValue false
	 */
	blank?: boolean
	/** Frozen-column controls, so a pinned column's figure sticks like its data cells. `null` when none. */
	pinning: GridColumnPinning | null
}

/**
 * The aggregate cells after an aggregate row's label span: one `<td>` per
 * remaining visible column. Each cell carries the column's aggregate where it
 * declares one and stays empty otherwise, so every figure sits under its own
 * column. A `blank` row keeps its cells, so the columns stay aligned, but
 * shows no figures. A frozen column's cell carries the sticky chrome of its
 * data cells (see {@link pinnedCellProps}), so its figure stays under its
 * header.
 * Shared by the client group header, the manual group header (which reads its
 * backend figures off `headerRow`), and the grand-total row.
 *
 * @internal
 */
export function GridAggregateCells<T>({
	columns,
	rows = NO_ROWS,
	headerRow,
	from,
	blank = false,
	pinning,
}: GridAggregateCellsProps<T>) {
	const { locale } = useLocale()

	return columns.slice(from).map((column) => {
		const pinned = pinnedCellProps(pinning, column)

		return (
			<TableCell
				key={column.id}
				data-grid-col={column.id}
				className={cn(k.aggregate.cell, pinned.className)}
				style={pinned.style}
				data-grid-pin={pinned.pin}
			>
				{blank ? null : renderAggregate(column, rows, locale, headerRow)}
			</TableCell>
		)
	})
}
