/**
 * Drag policy for the dashboard canvas: the board one drag target
 * previews, decided from the drag-start snapshot so the preview's own
 * changes can never feed back into the answer. A drag reorders against an
 * equal-span tile it mostly covers — an in-row insertion shift when the
 * two share a row (the run between them ripples over), a swap when the
 * partner is on another row. Anything else is blocked: the placeholder
 * clears and a drop changes nothing. Only the tiles the reorder names ever
 * move, and nothing ever grows the canvas. Pure over `(snapshot, id,
 * target)`, so all of it is unit-testable without a drag in sight.
 */

import { collides, type LayoutCell, shiftCells, swapCells } from './dashboard-layout'

/** What one target cell previews. @internal */
export type ReorderPreview = {
	/** The simulated board — the snapshot with the reorder applied. */
	cells: LayoutCell[]
	/** The equal-span tile a drop reorders against. */
	swapWith: string
	/**
	 * Whether the reorder is an in-row shift (the partner shares the dragged
	 * tile's row) rather than a cross-row swap — the two read differently in
	 * the live announcement.
	 */
	shift: boolean
}

/** The grid-unit area two cells share; `0` when they stand apart. @internal */
function overlapArea(a: LayoutCell, b: LayoutCell): number {
	const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)

	const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)

	return Math.max(0, w) * Math.max(0, h)
}

/** The non-self peer the target cell most overlaps, or `undefined` if it stands clear. */
function dominantPeer(
	snapshot: readonly LayoutCell[],
	id: string,
	target: LayoutCell,
): LayoutCell | undefined {
	let dominant: LayoutCell | undefined

	for (const peer of snapshot) {
		if (peer.id === id || !collides(peer, target)) continue

		if (dominant === undefined || overlapArea(peer, target) > overlapArea(dominant, target)) {
			dominant = peer
		}
	}

	return dominant
}

/**
 * The reorder one target cell previews, or `null` where a drop would change
 * nothing. An equal-span, non-static tile holding at least half the dragged
 * cell is the partner; under the halfway line the drop stays blocked, so a
 * reorder engages once, right at the mark. Half engages rather than blocks so
 * a slot the drag has reserved never flickers back at a boundary: between two
 * equal slots the crossover is a single quantized column where each holds
 * exactly half, and blocking it would collapse the gap home for that one step
 * — the displaced run animating toward the middle and back. A partner on the
 * dragged tile's own row shifts the row's run open to receive it; one on
 * another row trades places. Any other overlap — an unequal size, a static, or
 * open space — is blocked outright: the canvas only ever reorders equal tiles,
 * and never on its own initiative.
 *
 * @internal
 */
export function reorderPreview(
	snapshot: readonly LayoutCell[],
	id: string,
	tx: number,
	ty: number,
): ReorderPreview | null {
	const origin = snapshot.find((cell) => cell.id === id)

	if (origin === undefined || origin.static) return null

	const target = { ...origin, x: tx, y: ty }

	const dominant = dominantPeer(snapshot, id, target)

	if (dominant === undefined || dominant.static) return null

	const equalSpan = dominant.w === target.w && dominant.h === target.h

	if (equalSpan && overlapArea(dominant, target) * 2 >= target.w * target.h) {
		// The partner's row is the snapshot origin's row: same row shifts the run
		// open, another row trades places. `ty` can only leave the origin row by
		// clearing a whole tile height, so a same-row drag never reads as cross.
		const shift = dominant.y === origin.y

		const cells = shift
			? shiftCells(snapshot, id, dominant.id)
			: swapCells(snapshot, id, dominant.id)

		return { cells, swapWith: dominant.id, shift }
	}

	return null
}
