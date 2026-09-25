import type { DashboardCell } from '../../modules/dashboard/engine/dashboard-layout'

/**
 * Cell fixtures for the node suites of the dashboard engine.
 *
 * Not re-exported from `helpers/index.ts`. The barrel loads user-event, which
 * needs a window, and the engine suites run with none. Each suite imports this
 * module by its path.
 */

/**
 * A cell of the board, as the engine reads it.
 *
 * @param fixed - Whether the tile is static, so that no gesture moves it.
 * @returns The cell.
 */
export function cell(
	id: string,
	x: number,
	y: number,
	w: number,
	h: number,
	fixed = false,
): DashboardCell {
	return { id, x, y, w, h, static: fixed }
}

/**
 * The origin of each cell, by its id.
 *
 * @param cells - The cells to read. An absent list gives no origin.
 * @returns The column and the row of each cell.
 */
export function origins(
	cells: readonly DashboardCell[] | undefined,
): Record<string, [number, number]> {
	return Object.fromEntries((cells ?? []).map((item) => [item.id, [item.x, item.y]]))
}
