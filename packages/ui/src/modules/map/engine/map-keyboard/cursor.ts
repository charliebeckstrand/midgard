/**
 * How a keypress drives the cursor: the key table, the compass step across the
 * stop list, and the one resolution the plot region's handler asks for. The
 * three sit together because they form one chain with a single entry point —
 * {@link moveMapCursor} is the only production caller of either half.
 *
 * The stop list itself is `stops.ts`, which the plat builds and hands in.
 */

import type { MapStop } from './stops'

/** A compass step — the four directions an arrow key reads as. @internal */
type MapCompassAction = 'north' | 'south' | 'east' | 'west'

/** What a key does to the cursor: a compass step, a jump to an end, or a clear. @internal */
type MapCursorAction = MapCompassAction | 'first' | 'last' | 'clear'

/**
 * Reads a key to a cursor action. The arrows step by compass direction, which
 * is the map's own pair of axes where a chart's arrows step its category and
 * value axes; Home and End jump to the first and last drawn region in the
 * atlas's own order; Escape clears. Every other key returns `null` and stays
 * with the browser.
 */
function keyAction(key: string): MapCursorAction | null {
	switch (key) {
		case 'ArrowUp':
			return 'north'
		case 'ArrowDown':
			return 'south'
		case 'ArrowRight':
			return 'east'
		case 'ArrowLeft':
			return 'west'
		case 'Home':
			return 'first'
		case 'End':
			return 'last'
		case 'Escape':
			return 'clear'
		default:
			return null
	}
}

/** Whether a key activates the region under the cursor — Enter, or Space. @internal */
export function isMapActivateKey(key: string): boolean {
	return key === 'Enter' || key === ' '
}

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

/** The outcome of a keypress: whether it drove the cursor, and which stop it lands on. @internal */
export type MapCursorMove = {
	/** True when the key drove navigation, so the caller suppresses the browser default. */
	handled: boolean
	/** The stop the cursor lands on, or `null` to clear it. Meaningless unless `handled`. */
	stop: MapStop | null
}

/**
 * Resolves a keypress to the next stop. An arrow from rest — or off a stop the
 * list no longer holds — enters at the first one rather than stepping past it,
 * the way a chart's first arrow enters at its first point; from there each arrow
 * moves to the nearest stop bearing that way, and holds at the edge rather than
 * wrapping to the far side, which would read as a jump. Home and End go to the
 * ends of the list, which the plat orders geography-first. Unhandled keys pass
 * through untouched.
 *
 * Takes the cursor's position in the list and hands back the stop itself, so no
 * caller converts between the two: the index is this module's own coordinate
 * system, and it does not leak.
 *
 * @internal
 */
export function moveMapCursor(cursor: number | null, key: string, stops: MapStop[]): MapCursorMove {
	const action = keyAction(key)

	if (action === null) return { handled: false, stop: null }

	const at = (index: number | null) => (index === null ? null : (stops[index] ?? null))

	if (action === 'clear') return { handled: true, stop: null }

	if (action === 'first') return { handled: true, stop: at(0) }

	if (action === 'last') return { handled: true, stop: at(stops.length - 1) }

	const base = cursor !== null && stops[cursor] ? cursor : null

	if (base === null) return { handled: true, stop: at(0) }

	return { handled: true, stop: at(stepNearest(stops, base, action) ?? base) }
}
