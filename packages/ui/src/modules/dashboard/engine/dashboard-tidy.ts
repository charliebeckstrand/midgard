/**
 * The tidy command of the dashboard: one explicit pack that moves the tiles up.
 *
 * The board never packs itself, so a gap that a drag or a remove leaves stays
 * open. Tidy is the one bulk move that closes the gaps. Each tile keeps its
 * column and its span, and it moves straight up until it meets a tile or the top
 * edge. A tile therefore never passes another tile, and each column keeps its
 * order.
 */

import { type DashboardCell, patchCells } from './dashboard-layout'

/** Whether two cells share a column. */
function sharesColumn(a: DashboardCell, b: DashboardCell): boolean {
	return a.x < b.x + b.w && b.x < a.x + a.w
}

/**
 * The cells packed upward. The pack places the tiles in reading order. Each tile
 * moves up to the bottom edge of the lowest placed tile above it in its columns,
 * or to row `0`. A static tile never moves, and it stops each tile under it.
 *
 * @remarks
 * A layout with no overlap gives a result with no overlap. A tile that already
 * overlaps a placed tile stays where it is.
 *
 * @param cells - The resolved cells of the mounted tiles.
 * @returns The packed cells, or `cells` itself when no tile moves.
 */
export function tidyCells(cells: readonly DashboardCell[]): readonly DashboardCell[] {
	const placed = cells.filter((cell) => cell.static)

	const moving = cells.filter((cell) => !cell.static).sort((a, b) => a.y - b.y || a.x - b.x)

	const patch = new Map<string, Partial<DashboardCell>>()

	for (const cell of moving) {
		let y = 0

		// A placed tile above the cell in its columns sets the floor, and a placed
		// tile that overlaps the cell holds it where it is. A placed tile lower down
		// is a static tile under the cell, which an upward move cannot meet.
		for (const other of placed) {
			if (sharesColumn(cell, other) && other.y < cell.y + cell.h) {
				y = Math.max(y, Math.min(other.y + other.h, cell.y))
			}
		}

		if (y === cell.y) {
			placed.push(cell)

			continue
		}

		patch.set(cell.id, { y })

		placed.push({ ...cell, y })
	}

	return patch.size === 0 ? cells : patchCells(cells, patch)
}
