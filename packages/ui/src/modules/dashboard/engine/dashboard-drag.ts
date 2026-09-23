/**
 * The drag policy of the dashboard. It decides what one target cell previews, and
 * it reads only the snapshot from the start of the drag. The preview therefore
 * can never feed back into the answer.
 *
 * The policy tries four answers in order:
 *
 * 1. The target cells are free: the tile moves there.
 * 2. An equal-span tile covers at least half of the target: the two reorder. A
 *    partner in the same row shifts the run between them; another partner swaps.
 * 3. Else the tile snaps to the nearest free origin on the board. The drag
 *    therefore needs no precise aim, and the placeholder never goes away.
 * 4. When that nearest origin is the start cell, a drop changes nothing.
 *
 * Only the tiles that the answer names move. Nothing moves on its own.
 */

import {
	bottom,
	type DashboardCell,
	fits,
	moveCell,
	overlapArea,
	ROW_SUBDIVISION,
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

/**
 * The free origin nearest to `(x, y)` for the tile `id`, inside the travel
 * range. The distance counts one column as four rows, so the search is round on
 * screen, and a tie goes to the start cell. The row under the lowest tile is
 * always free, so an origin always exists. It returns `null` when the nearest
 * origin is the start cell, where a drop changes nothing.
 */
export function nearestFit(
	snapshot: readonly DashboardCell[],
	id: string,
	x: number,
	y: number,
	columns: number,
): { x: number; y: number } | null {
	const origin = snapshot.find((cell) => cell.id === id)

	if (origin === undefined) return null

	const { maxX, maxY } = dragTravel(snapshot, id, columns)

	for (const candidate of candidatesByDistance(origin, x, y, maxX, maxY)) {
		if (!fits(snapshot, { ...origin, ...candidate }, columns)) continue

		return candidate.x === origin.x && candidate.y === origin.y ? null : candidate
	}

	return null
}

/**
 * Each origin in the travel range, nearest to `(x, y)` first. The start cell
 * sorts first among the origins at its distance, so a tie snaps home.
 */
function candidatesByDistance(
	origin: DashboardCell,
	x: number,
	y: number,
	maxX: number,
	maxY: number,
): { x: number; y: number }[] {
	const candidates: { x: number; y: number; distance: number }[] = []

	for (let cy = 0; cy <= maxY; cy++) {
		for (let cx = 0; cx <= maxX; cx++) {
			const home = cx === origin.x && cy === origin.y ? -0.5 : 0

			candidates.push({
				x: cx,
				y: cy,
				distance: ((cx - x) * ROW_SUBDIVISION) ** 2 + (cy - y) ** 2 + home,
			})
		}
	}

	return candidates
		.sort((a, b) => a.distance - b.distance)
		.map(({ x: cx, y: cy }) => ({ x: cx, y: cy }))
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

	const reorder = reorderPreview(snapshot, origin, target)

	if (reorder !== null) return reorder

	const snap = nearestFit(snapshot, id, x, y, columns)

	return snap === null ? null : { cells: moveCell(snapshot, id, snap.x, snap.y), kind: 'move' }
}

/** The reorder against an equal-span partner that covers at least half of `target`, or `null`. */
function reorderPreview(
	snapshot: readonly DashboardCell[],
	origin: DashboardCell,
	target: DashboardCell,
): DashboardDragPreview | null {
	const partner = dominantPeer(snapshot, target)

	if (partner === undefined || partner.static) return null

	if (partner.w !== origin.w || partner.h !== origin.h) return null

	if (overlapArea(partner, target) * 2 < origin.w * origin.h) return null

	if (partner.y === origin.y) {
		return {
			cells: shiftCells(snapshot, origin.id, partner.id),
			kind: 'shift',
			partner: partner.id,
		}
	}

	return { cells: swapCells(snapshot, origin.id, partner.id), kind: 'swap', partner: partner.id }
}
