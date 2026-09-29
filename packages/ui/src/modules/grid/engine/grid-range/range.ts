/**
 * The cell range of a grid: the rectangle between an anchor cell and the
 * cursor. Both corners are places in the cursor's order, so a range over a
 * grouped or detail body spans its one-stop rows too. Only the data rows in
 * the rectangle are cells of the range.
 */

/** A place in the cursor's order and a data column index. @internal */
export type GridRangeCorner = { row: number; col: number }

/** The bounds of a range, inclusive on each side. @internal */
export type GridRangeRect = { top: number; bottom: number; left: number; right: number }

/** The rectangle between two corners, in either order. @internal */
export function rangeRect(anchor: GridRangeCorner, focus: GridRangeCorner): GridRangeRect {
	return {
		top: Math.min(anchor.row, focus.row),
		bottom: Math.max(anchor.row, focus.row),
		left: Math.min(anchor.col, focus.col),
		right: Math.max(anchor.col, focus.col),
	}
}

/** Whether the place `row` and the column `col` are inside `rect`. @internal */
export function inRangeRect(rect: GridRangeRect, row: number, col: number): boolean {
	return row >= rect.top && row <= rect.bottom && col >= rect.left && col <= rect.right
}

/**
 * The cells of a range: the data row indexes in display order, and the data
 * column indexes from left to right. A caller reads each cell as the pair of
 * a row and a column. `from` is the anchor and `to` is the cursor, each as a
 * data row index and a data column index. @internal
 */
export type GridRangeCells = {
	rows: number[]
	cols: number[]
	from: GridRangeCorner
	to: GridRangeCorner
}

/**
 * The cells of the range from `anchor` to `focus`. `dataRowOf` gives the data
 * row index of a place, or -1 for a one-stop row, which the range steps over.
 * @internal
 */
export function rangeCells(
	anchor: GridRangeCorner,
	focus: GridRangeCorner,
	dataRowOf: (row: number) => number,
): GridRangeCells {
	const rect = rangeRect(anchor, focus)

	const rows: number[] = []

	for (let row = rect.top; row <= rect.bottom; row++) {
		const data = dataRowOf(row)

		if (data !== -1) rows.push(data)
	}

	const cols: number[] = []

	for (let col = rect.left; col <= rect.right; col++) cols.push(col)

	const from = { row: dataRowOf(anchor.row), col: anchor.col }

	const to = { row: dataRowOf(focus.row), col: focus.col }

	return { rows, cols, from, to }
}

/** The width of the band at each edge of the scroll region where a drag scrolls it, in pixels. @internal */
export const RANGE_EDGE = 32

/** The most pixels that one frame of a drag scrolls. @internal */
const RANGE_EDGE_STEP = 24

/** The scroll of one axis for a pointer at `at`, between `start` and `end`. */
function edgeAxisStep(at: number, start: number, end: number): number {
	const before = start + RANGE_EDGE - at

	if (before > 0) return -Math.min(RANGE_EDGE_STEP, Math.ceil(before / 2))

	const after = at - (end - RANGE_EDGE)

	if (after > 0) return Math.min(RANGE_EDGE_STEP, Math.ceil(after / 2))

	return 0
}

/**
 * How far one frame of a drag scrolls the scroll region, on each axis. A
 * pointer in the band at an edge, or past the edge, scrolls toward that edge,
 * and faster as it goes further. A pointer in the middle scrolls nothing.
 *
 * @internal
 */
export function edgeScrollStep(
	point: { x: number; y: number },
	rect: { left: number; top: number; right: number; bottom: number },
): { x: number; y: number } {
	return {
		x: edgeAxisStep(point.x, rect.left, rect.right),
		y: edgeAxisStep(point.y, rect.top, rect.bottom),
	}
}
