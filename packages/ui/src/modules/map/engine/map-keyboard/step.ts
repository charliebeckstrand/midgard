/**
 * The compass step across the stop list — the geography's own pair of axes,
 * standing where a chart's arrows step its category and value axes. The wedge
 * rule below is what makes every stop reachable from every other, so no step
 * needs a fallback.
 */

import type { MapCompassAction } from './keys'
import type { MapStop } from './stops'

/**
 * Whether the offset `dx`, `dy` bears in `action`'s direction: its quadrant is
 * the 90° wedge around that compass axis, so the four wedges tile the plane and
 * every other region lies in exactly one of them (a region exactly on a diagonal
 * lies in two, and either reading is true). Nothing is therefore unreachable
 * from anywhere, and no step needs a fallback.
 *
 * Frame coordinates put y downward, so north is the negative side.
 */
function bears(dx: number, dy: number, action: MapCompassAction): boolean {
	switch (action) {
		case 'east':
			return dx > 0 && Math.abs(dy) <= dx
		case 'west':
			return dx < 0 && Math.abs(dy) <= -dx
		case 'south':
			return dy > 0 && Math.abs(dx) <= dy
		case 'north':
			return dy < 0 && Math.abs(dx) <= -dy
	}
}

/**
 * The nearest stop bearing `action` from `from`, or `null` when the wedge in
 * that direction is empty — the edge of the map, where the cursor holds rather
 * than wraps, the clamp a chart's category step keeps. Distance is compared
 * squared, so the scan takes no square root.
 *
 * @internal
 */
export function stepNearest(
	stops: MapStop[],
	from: number,
	action: MapCompassAction,
): number | null {
	const origin = stops[from]

	if (!origin) return null

	let best: number | null = null

	let bestDistance = Number.POSITIVE_INFINITY

	for (const [index, stop] of stops.entries()) {
		if (index === from) continue

		const dx = stop.at.x - origin.at.x

		const dy = stop.at.y - origin.at.y

		if (!bears(dx, dy, action)) continue

		const distance = dx * dx + dy * dy

		if (distance < bestDistance) {
			best = index

			bestDistance = distance
		}
	}

	return best
}
