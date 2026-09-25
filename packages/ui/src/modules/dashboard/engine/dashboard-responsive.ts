/**
 * The responsive projection of the dashboard. When the container renders a tile
 * under its `minWidth`, the board paints a content-first re-pack of the same
 * layout. The starved tiles widen, and the tiles fill shelves in reading order.
 * Each shelf stretches to the full span, and a narrow board becomes a stack.
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
} from './dashboard-layout'

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

/**
 * Places one shelf at row `y`, and returns its height. The spare columns spread
 * across the tiles in proportion to their spans, so the shelf fills the width.
 */
function placeShelf(
	shelf: Shelf,
	y: number,
	columns: number,
	demands: ReadonlyMap<string, DashboardTileDemands>,
	into: Map<string, DashboardCell>,
): number {
	const spare = columns - shelf.used

	const extras = shelf.spans.map((span) => Math.floor((spare * span) / shelf.used))

	let remainder = spare - extras.reduce((sum, extra) => sum + extra, 0)

	let x = 0

	let height = 0

	shelf.cells.forEach((cell, index) => {
		const w = (shelf.spans[index] ?? cell.w) + (extras[index] ?? 0) + (remainder > 0 ? 1 : 0)

		if (remainder > 0) remainder -= 1

		const h = heightAt(w, cell.h, demands.get(cell.id)?.ratio)

		into.set(cell.id, { ...cell, x, y, w, h })

		x += w

		height = Math.max(height, h)
	})

	return height
}

/**
 * Projects `cells` for a container `width` px wide. It returns the input when
 * each tile has the width that it demands.
 */
export function projectLayout(
	cells: readonly DashboardCell[],
	{ width, gap, columns, demands }: DashboardProjectionOptions,
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

	const order = [...cells].sort((a, b) => a.y - b.y || a.x - b.x)

	const placed = new Map<string, DashboardCell>()

	let shelf: Shelf = { cells: [], spans: [], used: 0 }

	let y = 0

	for (const cell of order) {
		const span = spans.get(cell.id) ?? cell.w

		if (shelf.used > 0 && shelf.used + span > columns) {
			y += placeShelf(shelf, y, columns, demands, placed)

			shelf = { cells: [], spans: [], used: 0 }
		}

		shelf.cells.push(cell)

		shelf.spans.push(span)

		shelf.used += span
	}

	if (shelf.used > 0) placeShelf(shelf, y, columns, demands, placed)

	return { cells: cells.map((cell) => placed.get(cell.id) ?? cell), identity: false }
}
