/**
 * The drag policy of the dashboard. It decides what one target cell previews, and
 * it reads only the snapshot from the start of the drag. The preview therefore
 * can never feed back into the answer.
 *
 * The policy tries three answers in order:
 *
 * 1. The target cells are free: the tile moves there.
 * 2. An equal-span tile covers at least half of the target: the two reorder. A
 *    partner in the same row shifts the run between them; another partner swaps.
 * 3. Anything else is blocked, and a drop changes nothing.
 *
 * Only the tiles that the answer names move. Nothing moves on its own.
 */

import {
	bottom,
	type DashboardCell,
	fits,
	moveCell,
	overlapArea,
	shiftCells,
	swapCells,
} from './dashboard-layout'

/** How a drag preview changes the board. */
export type DashboardDragKind = 'move' | 'shift' | 'swap'

/** The board that one target cell previews. */
export type DashboardDragPreview = {
	/** The snapshot with the change applied. */
	cells: DashboardCell[]
	/** The kind of change. */
	kind: DashboardDragKind
	/** The tile that a shift or a swap reorders against. */
	partner?: string
}

/**
 * The range of origins that a dragged tile can reach. A tile can go one row band
 * under the lowest other tile, so a drag can open a new row.
 */
export type DashboardDragTravel = {
	/** The largest `x` origin. */
	maxX: number
	/** The largest `y` origin. */
	maxY: number
}

/** The travel range of the tile `id` over `snapshot`. */
export function dragTravel(
	snapshot: readonly DashboardCell[],
	id: string,
	columns: number,
): DashboardDragTravel {
	const origin = snapshot.find((cell) => cell.id === id)

	if (origin === undefined) return { maxX: 0, maxY: 0 }

	return {
		maxX: Math.max(0, columns - origin.w),
		maxY: Math.max(origin.y, bottom(snapshot, id)),
	}
}

/** The peer that covers the most of `target`, or `undefined` when no peer touches it. */
function dominantPeer(
	snapshot: readonly DashboardCell[],
	target: DashboardCell,
): DashboardCell | undefined {
	let dominant: DashboardCell | undefined

	let most = 0

	for (const peer of snapshot) {
		if (peer.id === target.id) continue

		const area = overlapArea(peer, target)

		if (area > most) {
			dominant = peer

			most = area
		}
	}

	return dominant
}

/**
 * The preview for the tile `id` at the origin `(x, y)`, or `null` when a drop
 * there changes nothing. The caller rounds and clamps the origin first.
 *
 * @remarks
 * A reorder engages at half coverage, not over half. Between two equal slots
 * the crossover is one column where each slot holds exactly half. A stricter
 * test would block that one column, and the shifted run would move home and
 * back for one step.
 */
export function dragPreview(
	snapshot: readonly DashboardCell[],
	id: string,
	x: number,
	y: number,
	columns: number,
): DashboardDragPreview | null {
	const origin = snapshot.find((cell) => cell.id === id)

	if (origin === undefined || origin.static) return null

	if (x === origin.x && y === origin.y) return null

	const target = { ...origin, x, y }

	if (fits(snapshot, target, columns)) {
		return { cells: moveCell(snapshot, id, x, y), kind: 'move' }
	}

	const partner = dominantPeer(snapshot, target)

	if (partner === undefined || partner.static) return null

	if (partner.w !== origin.w || partner.h !== origin.h) return null

	if (overlapArea(partner, target) * 2 < origin.w * origin.h) return null

	if (partner.y === origin.y) {
		return { cells: shiftCells(snapshot, id, partner.id), kind: 'shift', partner: partner.id }
	}

	return { cells: swapCells(snapshot, id, partner.id), kind: 'swap', partner: partner.id }
}
