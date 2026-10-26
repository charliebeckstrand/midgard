'use client'

import { TableCell } from '../../components/table'
import { cn } from '../../core'
import type { PaletteColor } from '../../core/recipe'
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
	/** The group's overlay color, tinting each aggregate cell at low opacity; `undefined` leaves them untinted. */
	color?: PaletteColor
	/** Frozen-column controls, so a pinned column's figure sticks like its data cells. `null` when none. */
	pinning: GridColumnPinning | null
}

/**
 * The aggregate cells after an aggregate row's label span: one `<td>` per
 * remaining visible column. Each cell carries the column's aggregate where it
 * declares one and stays empty otherwise, so every figure sits under its own
 * column. A `color` washes each cell in the group's hue at low opacity. A
 * frozen column's cell carries the sticky chrome of its data cells (see
 * {@link pinnedCellProps}), so its figure stays under its header. Its opaque
 * surface replaces the wash, because the scrolled cells must not show through.
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
	color,
	pinning,
}: GridAggregateCellsProps<T>) {
	const { locale } = useLocale()

	return columns.slice(from).map((column) => {
		const pinned = pinnedCellProps(pinning, column)

		return (
			<TableCell
				key={column.id}
				data-grid-col={column.id}
				className={cn(k.aggregate.cell, color && k.row.group.tint[color], pinned.className)}
				style={pinned.style}
				data-grid-pin={pinned.pin}
			>
				{renderAggregate(column, rows, locale, headerRow)}
			</TableCell>
		)
	})
}
