/**
 * How a keypress drives the cursor. It holds the key table, the compass step
 * across the stop list, and the one resolution the plot region's handler asks
 * for. The
 * three sit together because they form one chain with a single entry point —
 * {@link moveCursor} is the only production caller of either half.
 *
 * The stop list itself is `stops.ts`, which the plat builds and hands in.
 */

import type { MapStop } from './stops'

/** A compass step — the four directions an arrow key reads as. @internal */
type MapCompassAction = 'north' | 'south' | 'east' | 'west'

/** What a key does to the cursor: a compass step, a jump to an end, or a clear. @internal */
type MapCursorAction = MapCompassAction | 'first' | 'last' | 'clear'

/**
 * The key table. The arrows step by compass direction, the map's own pair of
 * axes, where a chart's arrows step its category and value axes. Home and End
 * jump to the first and last drawn region in the atlas's own order. Escape
 * clears.
 */
const KEY_ACTIONS: Record<string, MapCursorAction> = {
	ArrowUp: 'north',
	ArrowDown: 'south',
	ArrowRight: 'east',
	ArrowLeft: 'west',
	Home: 'first',
	End: 'last',
	Escape: 'clear',
}

/** Reads a key to a cursor action. A key outside the table returns `null` and stays with the browser. */
function keyAction(key: string): MapCursorAction | null {
	return KEY_ACTIONS[key] ?? null
}

/** Whether a key activates the region under the cursor — Enter, or Space. @internal */
export function isActivateKey(key: string): boolean {
	return key === 'Enter' || key === ' '
}

/**
 * Whether the offset `dx`, `dy` bears in `action`'s direction. Its quadrant is
 * the 90° wedge around that compass axis. The four wedges therefore tile the
 * plane, and every other region lies in exactly one of them. A region exactly on
 * a diagonal lies in two, and either reading is true. A stop at a zero offset
 * bears no direction: {@link stepNearest} reaches it through its stack.
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
 * that direction is empty. That is the edge of the map, where the cursor holds
 * rather than wraps, the clamp a chart's category step keeps. Distance is compared
 * squared, so the scan takes no square root.
 *
 * Stops at one point form a stack, such as a geofence and the point at its
 * center. An arrow visits each stop of the stack in list order before it leaves
 * the stack. A step into a stack lands on its first stop, so no stop of the
 * stack is unreachable.
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

	for (let index = from + 1; index < stops.length; index++) {
		const at = stops[index]?.at

		if (at?.x === origin.at.x && at.y === origin.at.y) return index
	}

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

/** The outcome of a keypress: whether it drove the cursor, whether it leaves, and which stop it lands on. @internal */
export type MapCursorMove = {
	/** True when the key drove navigation, so the caller suppresses the browser default. */
	handled: boolean
	/** True only for the clear action. The cursor clears and focus leaves the region. */
	leave: boolean
	/** The stop the cursor lands on, or `null` when it has no stop to land on. Meaningless unless `handled`. */
	stop: MapStop | null
}

/**
 * Resolves a keypress to the next stop. An arrow from rest enters at the first
 * stop, rather than stepping past it. That is the way a chart's first arrow
 * enters at its first point. It holds for an arrow off a stop the list no longer
 * holds. From there each arrow moves to the nearest stop bearing that way. It
 * holds at the edge, rather than wrapping to the far side, which would read as a
 * jump. Home and End go to the ends of the list, which the plat orders
 * geography-first. On an empty list, a navigation key is handled and moves
 * nothing: the key does not scroll the page, and only the clear action leaves.
 * Unhandled keys pass through untouched.
 *
 * Takes the cursor's position in the list and hands back the stop itself, so no
 * caller converts between the two. The index is this module's own coordinate
 * system, and it does not leak.
 *
 * @internal
 */
export function moveCursor(cursor: number | null, key: string, stops: MapStop[]): MapCursorMove {
	const action = keyAction(key)

	if (action === null) return { handled: false, leave: false, stop: null }

	const at = (index: number | null) => (index === null ? null : (stops[index] ?? null))

	if (action === 'clear') return { handled: true, leave: true, stop: null }

	if (action === 'first') return { handled: true, leave: false, stop: at(0) }

	if (action === 'last') return { handled: true, leave: false, stop: at(stops.length - 1) }

	const base = cursor !== null && stops[cursor] ? cursor : null

	if (base === null) return { handled: true, leave: false, stop: at(0) }

	return { handled: true, leave: false, stop: at(stepNearest(stops, base, action) ?? base) }
}
