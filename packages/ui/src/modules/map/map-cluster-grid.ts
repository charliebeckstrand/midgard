/**
 * The uniform grid both of `map-cluster`'s passes bucket into, at one cell per
 * reach: an entry within reach of a point can only sit in that point's own cell
 * or one of the eight around it, so each mark reads nine buckets rather than
 * every group built before it — a linear pass where the naive scan is quadratic.
 *
 * Generic over what a cell holds, because the broad phase files seeds and the
 * merge round files slot indices, and neither pass may pay for the other's
 * shape.
 */

import type { MapPoint2D } from './map-geometry'

/**
 * The stride one cell index carries in a packed key, which bounds the other to
 * the ±32,768 either side of it. Cell indices are frame coordinates over the
 * reach, so they sit far inside that.
 *
 * @internal
 */
const CELL_STRIDE = 65_536

/**
 * The grid key for one cell. Packed into a number rather than a string:
 * {@link walkNear} reads nine cells per mark, and building nine strings each
 * would allocate by the thousand across a set of hundreds. See
 * {@link CELL_STRIDE} for the range the packing holds.
 *
 * @internal
 */
function cellKey(cx: number, cy: number): number {
	return cx * CELL_STRIDE + cy
}

/** The cell key a frame position falls under. @internal */
export function cellOf(at: MapPoint2D, reach: number): number {
	return cellKey(Math.floor(at.x / reach), Math.floor(at.y / reach))
}

/** The bucket for a cell, created empty on first use. @internal */
export function bucket<T>(cells: Map<number, T[]>, key: number): T[] {
	const held = cells.get(key)

	if (held !== undefined) return held

	const fresh: T[] = []

	cells.set(key, fresh)

	return fresh
}

/**
 * Walks every entry indexed in the nine cells around a point — at one cell per
 * reach, the whole field a merge can cross — and stops as soon as `visit`
 * answers `true`.
 *
 * A walk rather than a returned list: both passes run this per mark across sets
 * of hundreds, and a list would allocate one array each — the cost the numeric
 * cell key above exists to avoid.
 *
 * @internal
 */
export function walkNear<T>(
	cells: Map<number, T[]>,
	at: MapPoint2D,
	reach: number,
	visit: (entry: T) => boolean,
): void {
	const cx = Math.floor(at.x / reach)

	const cy = Math.floor(at.y / reach)

	for (let step = 0; step < 9; step++) {
		const held = cells.get(cellKey(cx + ((step % 3) - 1), cy + (Math.floor(step / 3) - 1)))

		if (held === undefined) continue

		for (const entry of held) if (visit(entry)) return
	}
}
