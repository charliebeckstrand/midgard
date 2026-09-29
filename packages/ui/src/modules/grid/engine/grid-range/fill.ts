/**
 * The fill of a cell range: the values that a source line of cells gives to
 * the cells after it. A line of numbers with a constant step continues the
 * step, and each other line repeats.
 */

/** The direction of a fill, from the source cells to the cells that it writes. @internal */
export type GridFillDirection = 'down' | 'right' | 'up' | 'left'

/** The significant digits that a series value keeps, so `0.1 + 0.2` gives `0.3`. */
const SERIES_PRECISION = 15

/** The step of a line of numbers, or `null` when the line is not a series. */
function seriesStep(line: readonly unknown[]): number | null {
	if (line.length < 2) return null

	if (!line.every((value) => typeof value === 'number' && Number.isFinite(value))) return null

	const numbers = line as readonly number[]

	const step = (numbers[1] as number) - (numbers[0] as number)

	const tolerance = 1e-9 * Math.max(1, Math.abs(step))

	for (let i = 2; i < numbers.length; i++) {
		const gap = (numbers[i] as number) - (numbers[i - 1] as number)

		if (Math.abs(gap - step) > tolerance) return null
	}

	return step
}

/**
 * The next `count` values after a source line, in fill order. A line of two
 * or more numbers with a constant step continues the step (`1, 2` gives
 * `3, 4, 5`). Each other line repeats from its first value. @internal
 */
export function fillLine(line: readonly unknown[], count: number): unknown[] {
	if (line.length === 0 || count <= 0) return []

	const step = seriesStep(line)

	const last = line[line.length - 1] as number

	return Array.from({ length: count }, (_, k) =>
		step === null
			? line[k % line.length]
			: Number((last + step * (k + 1)).toPrecision(SERIES_PRECISION)),
	)
}

/** One cell that a fill writes: a data row index, a data column index, and its value. @internal */
export type GridFillTarget = { row: number; col: number; value: unknown }

/**
 * The cells that a fill writes. `source` gives the data row indexes and the
 * data column indexes of the source cells, each in order. The fill writes
 * `count` lines after the source in `direction`, and each column (for a fill
 * down or up) or each row (for a fill right or left) is one source line.
 * `read` gives the value of a source cell. For a fill up or left, the line
 * reads from the far edge toward the fill, so a series runs the same way.
 * @internal
 */
export function fillPlan(
	source: { rows: readonly number[]; cols: readonly number[] },
	direction: GridFillDirection,
	count: number,
	read: (row: number, col: number) => unknown,
): GridFillTarget[] {
	const vertical = direction === 'down' || direction === 'up'

	const back = direction === 'up' || direction === 'left'

	const along = vertical ? source.rows : source.cols

	const across = vertical ? source.cols : source.rows

	const first = along[0]

	const last = along[along.length - 1]

	if (first === undefined || last === undefined) return []

	const order = back ? [...along].reverse() : along

	const targets: GridFillTarget[] = []

	for (const line of across) {
		const values = fillLine(
			order.map((at) => (vertical ? read(at, line) : read(line, at))),
			count,
		)

		values.forEach((value, k) => {
			const at = back ? first - k - 1 : last + k + 1

			targets.push(vertical ? { row: at, col: line, value } : { row: line, col: at, value })
		})
	}

	return targets
}

/** The two fills that a key or a menu item starts: down from the top row, or right from the first column. @internal */
export type GridRangeFillDirection = 'down' | 'right'

/**
 * The fill of a range that a key or a menu item starts. It reads the range
 * now, and returns the fill of that range in `direction`, or `null` when the
 * range cannot fill that way. The context menu reads it when it opens, so an
 * item fills the range that the menu opened on, after focus leaves the grid.
 * @internal
 */
export type GridRangeFill = (direction: GridRangeFillDirection) => (() => void) | null

/**
 * The source cells and the count of lines of a fill of `cells`, or `null`
 * when the range is one cell deep in `direction`. A fill down takes the top
 * row as its source, and a fill right takes the first column. @internal
 */
export function rangeFillSource(
	cells: { rows: readonly number[]; cols: readonly number[] },
	direction: GridRangeFillDirection,
): { source: { rows: readonly number[]; cols: readonly number[] }; count: number } | null {
	const down = direction === 'down'

	const along = down ? cells.rows : cells.cols

	if (along.length < 2) return null

	const source = down
		? { rows: cells.rows.slice(0, 1), cols: cells.cols }
		: { rows: cells.rows, cols: cells.cols.slice(0, 1) }

	return { source, count: along.length - 1 }
}
