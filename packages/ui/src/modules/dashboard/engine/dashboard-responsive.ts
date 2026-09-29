/**
 * The responsive projection of the dashboard. When the container renders a tile
 * under its `minWidth`, the board paints a content-first re-pack of the same
 * layout. The starved tiles widen, and the tiles fill shelves in reading order.
 * Each shelf stretches to the full span, and a narrow board becomes a stack.
 * Each tile keeps its shape: a free-form tile scales its row span with its
 * column span, and a tile with a fixed ratio derives its height.
 *
 * The projection is a view. It never writes to the saved layout, and the saved
 * layout returns when the container is wide enough again. There is no
 * breakpoint: the demands of the tiles decide. The projection holds no state,
 * and the store adds a hold of 24 px to the return (`PROJECTION_HOLD`).
 */

import {
	type DashboardCell,
	type DashboardTileDemands,
	heightAt,
	minColumns,
	ROW_SUBDIVISION,
} from './dashboard-layout'

/**
 * The row span of a free-form tile at `w` columns. It keeps the shape of the
 * saved cell, because the rows follow the column pitch. A tile that widens
 * without it goes flat, and its content clips.
 */
function scaledHeight(cell: DashboardCell, w: number): number {
	return Math.max(1, Math.round((cell.h * w) / cell.w))
}

/** The inputs of one projection. */
export type DashboardProjectionOptions = {
	/** The container width in px. The value `0` means not measured, and it projects nothing. */
	width: number
	/** The gutter in px. */
	gap: number
	/** The column count. */
	columns: number
	/** The registered demands of the tiles. */
	demands: ReadonlyMap<string, DashboardTileDemands>
	/**
	 * The content height in px of each tile that takes the height of its content
	 * in the re-pack. The re-pack gives such a tile the rows that hold this height.
	 * The saved layout ignores it.
	 */
	heights?: ReadonlyMap<string, number>
	/**
	 * The painted width in px, which sets the height of a row. It differs from
	 * `width` while the store holds a projection. It defaults to `width`.
	 */
	painted?: number
}

/** The result of one projection. */
export type DashboardProjection = {
	/** The cells to paint. */
	cells: readonly DashboardCell[]
	/** Whether the cells are the input cells, unchanged. */
	identity: boolean
}

/** One shelf of tiles in the re-pack. */
type Shelf = { cells: DashboardCell[]; spans: number[]; used: number }

/** The inputs of one shelf that are the same for each shelf. */
type ShelfGrid = {
	columns: number
	demands: ReadonlyMap<string, DashboardTileDemands>
	heights: ReadonlyMap<string, number> | undefined
	/** The height of one row in px. */
	row: number
	/** The gutter in px. */
	gap: number
}

/**
 * The row span of the tile `cell` at `w` columns. A tile that takes the height
 * of its content gets the rows that hold that height and the gutter.
 */
function spanOf(cell: DashboardCell, w: number, grid: ShelfGrid): number {
	const content = grid.heights?.get(cell.id)

	if (content !== undefined && grid.row > 0) {
		return Math.max(1, Math.ceil((content + grid.gap) / grid.row))
	}

	return heightAt(w, scaledHeight(cell, w), grid.demands.get(cell.id)?.ratio)
}

/**
 * Places one shelf at row `y`, and returns its height. The spare columns spread
 * across the tiles in proportion to their spans, so the shelf fills the width.
 * A tile that takes the height of its content takes the height of the shelf.
 */
function placeShelf(
	shelf: Shelf,
	y: number,
	grid: ShelfGrid,
	into: Map<string, DashboardCell>,
): number {
	const spare = grid.columns - shelf.used

	const extras = shelf.spans.map((span) => Math.floor((spare * span) / shelf.used))

	let remainder = spare - extras.reduce((sum, extra) => sum + extra, 0)

	let x = 0

	let height = 0

	shelf.cells.forEach((cell, index) => {
		const w = (shelf.spans[index] ?? cell.w) + (extras[index] ?? 0) + (remainder > 0 ? 1 : 0)

		if (remainder > 0) remainder -= 1

		const h = spanOf(cell, w, grid)

		into.set(cell.id, { ...cell, x, y, w, h })

		x += w

		height = Math.max(height, h)
	})

	// A tile that takes the height of its content grows to the height of its
	// shelf, so the cards on one shelf end on one line.
	for (const cell of shelf.cells) {
		const placed = into.get(cell.id)

		if (placed !== undefined && grid.heights?.has(cell.id) === true) {
			into.set(cell.id, { ...placed, h: height })
		}
	}

	return height
}

/**
 * Projects `cells` for a container `width` px wide. It returns the input when
 * each tile has the width that it demands.
 */
export function projectLayout(
	cells: readonly DashboardCell[],
	{ width, gap, columns, demands, heights, painted = width }: DashboardProjectionOptions,
): DashboardProjection {
	if (width <= 0) return { cells, identity: true }

	const pitch = width / columns

	const spans = new Map<string, number>()

	let starved = false

	for (const cell of cells) {
		const minWidth = demands.get(cell.id)?.minWidth

		const span =
			minWidth === undefined ? cell.w : Math.max(cell.w, minColumns(minWidth, gap, pitch, columns))

		spans.set(cell.id, span)

		if (span > cell.w) starved = true
	}

	if (!starved) return { cells, identity: true }

	// The rows follow the column pitch. The painted width spans the two outer
	// half-gutters, so a row is that width over the row count of the board.
	const grid: ShelfGrid = {
		columns,
		demands,
		heights,
		row: painted / (columns * ROW_SUBDIVISION),
		gap,
	}

	const order = [...cells].sort((a, b) => a.y - b.y || a.x - b.x)

	const placed = new Map<string, DashboardCell>()

	let shelf: Shelf = { cells: [], spans: [], used: 0 }

	let y = 0

	for (const cell of order) {
		const span = spans.get(cell.id) ?? cell.w

		if (shelf.used > 0 && shelf.used + span > columns) {
			y += placeShelf(shelf, y, grid, placed)

			shelf = { cells: [], spans: [], used: 0 }
		}

		shelf.cells.push(cell)

		shelf.spans.push(span)

		shelf.used += span
	}

	if (shelf.used > 0) placeShelf(shelf, y, grid, placed)

	return { cells: cells.map((cell) => placed.get(cell.id) ?? cell), identity: false }
}
