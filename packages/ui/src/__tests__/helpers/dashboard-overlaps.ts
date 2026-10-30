import { collides, type DashboardCell } from '../../modules/dashboard/engine/dashboard-layout'

/**
 * Each pair of cells that overlap, as the `collides` of the engine reads them.
 *
 * @remarks
 * Not re-exported from `helpers/index.ts`. The barrel loads user-event, which
 * needs a window, and the engine suites run with none. Each suite imports this
 * module by its path. A failure of `expect(overlaps(cells)).toEqual([])` shows
 * the two cells of each pair.
 *
 * @param cells - The cells of the board.
 * @returns The pairs, in board order, with each pair once.
 */
export function overlaps(cells: readonly DashboardCell[]): [DashboardCell, DashboardCell][] {
	return cells.flatMap((a, index) =>
		cells
			.slice(index + 1)
			.filter((b) => collides(a, b))
			.map((b): [DashboardCell, DashboardCell] => [a, b]),
	)
}
