/**
 * The figures of a cell range: the count of the cells that hold a value, and
 * the sum, the mean, the minimum, and the maximum of the cells that hold a
 * number. The footer shows them, and the grid speaks them with the range.
 */

import { type Aggregation, reduceNumbers } from '../../../../utilities/aggregate'
import { parseNumeric } from '../../../../utilities/parse-numeric'
import type { GridColumn } from '../../types'
import { columnAccessor } from '../grid-column/accessor'
import type { GridRangeCells } from './range'

/** The figures of `rangeFigures: true`, in the order of the spreadsheets. @internal */
export const RANGE_FIGURES_DEFAULT: readonly Aggregation[] = ['count', 'sum', 'avg']

/** One figure of a range: its aggregation and its value. @internal */
export type GridRangeFigure = { op: Aggregation; value: number }

/** Whether a cell holds no value: no value, or text of only white space. @internal */
export function isBlank(value: unknown): boolean {
	return value == null || (typeof value === 'string' && value.trim() === '')
}

/**
 * The count of the cells of a range that hold a value, and the numbers of the
 * cells that hold a number. A row or a column that is gone holds no cell.
 */
function readCells<T>(
	cells: GridRangeCells,
	rows: readonly T[],
	columns: readonly GridColumn<T>[],
): { count: number; numbers: number[] } {
	let count = 0

	const numbers: number[] = []

	for (const col of cells.cols) {
		const column = columns[col]

		if (!column) continue

		const accessor = columnAccessor(column)

		for (const index of cells.rows) {
			const row = rows[index]

			const value = row === undefined ? undefined : accessor(row)

			if (isBlank(value)) continue

			count++

			const number = parseNumeric(value)

			if (number !== null) numbers.push(number)
		}
	}

	return { count, numbers }
}

/**
 * The figures of the cells of a range, in the order of `ops`. A range of one
 * cell or less has no figures, so the list is empty. Each cell reads through
 * the accessor of its column, as aggregation and export read it. `count`
 * counts each cell that holds a value, text too. The other figures read the
 * cells that {@link parseNumeric} reads as a number, and a range with no such
 * cell gives none of them.
 *
 * @internal
 */
export function rangeFigures<T>(
	cells: GridRangeCells | null,
	rows: readonly T[],
	columns: readonly GridColumn<T>[],
	ops: readonly Aggregation[],
): GridRangeFigure[] {
	if (!cells || cells.rows.length * cells.cols.length < 2) return []

	const { count, numbers } = readCells(cells, rows, columns)

	return ops.flatMap((op): GridRangeFigure[] => {
		if (op === 'count') return [{ op, value: count }]

		return numbers.length === 0 ? [] : [{ op, value: reduceNumbers(numbers, op) }]
	})
}
