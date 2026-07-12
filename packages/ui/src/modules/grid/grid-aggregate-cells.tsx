'use client'

import { TableCell } from '../../components/table'
import { cn } from '../../core'
import type { PaletteColor } from '../../core/recipe'
import { k } from '../../recipes/kata/grid'
import { renderAggregate } from './engine/grid-aggregate'
import type { GridColumn } from './types'

/** Stable empty row set for the manual (header-row) aggregate path. @internal */
const NO_ROWS: never[] = []

/** Props for {@link GridAggregateCells}. @internal */
type GridAggregateCellsProps<T> = {
	/** The visible columns, in render order. */
	columns: GridColumn<T>[]
	/** The rows behind the aggregates; omitted on the manual path. */
	rows?: T[]
	/** A manual group-header row carrying backend aggregates, read instead of computing over rows. */
	headerRow?: T
	/** The first column index to render — the cells after the row's label span. */
	from: number
	/** The group's overlay color, tinting each aggregate cell at low opacity; `undefined` leaves them untinted. */
	color?: PaletteColor
}

/**
 * The aggregate cells after an aggregate row's label span: one `<td>` per
 * remaining visible column, carrying the column's aggregate where it declares
 * one and staying empty otherwise, so every figure sits under its own column. A
 * `color` washes each cell in the group's hue at low opacity. Shared by the
 * client group header, the manual group header (which reads its backend
 * figures off `headerRow`), and the grand-total row.
 *
 * @internal
 */
export function GridAggregateCells<T>({
	columns,
	rows = NO_ROWS,
	headerRow,
	from,
	color,
}: GridAggregateCellsProps<T>) {
	return columns.slice(from).map((column) => (
		<TableCell
			key={column.id}
			data-grid-col={column.id}
			className={cn(k.aggregate.cell, color && k.rowGroup.tint[color], column.className)}
		>
			{renderAggregate(column, rows, headerRow)}
		</TableCell>
	))
}
