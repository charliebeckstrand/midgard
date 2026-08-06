/**
 * Pure cursor math for the map module's keyboard navigation: the compass step
 * over projected region centroids. Kept React-free beside `map-geometry.ts` and
 * `map-projection.ts`, so the math is unit-testable in isolation. The
 * frame-to-client conversion the cursor anchors through is projection math, and
 * lives with the rest of it in `map-projection.ts`.
 */

import type { MapPoint2D } from './map-geometry'

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

/** The first region carrying a centroid, or `null` when none does. */
function firstRegion(centroids: (MapPoint2D | null)[]): number | null {
	for (const [index, centroid] of centroids.entries()) if (centroid) return index

	return null
}

/** The last region carrying a centroid, or `null` when none does. */
function lastRegion(centroids: (MapPoint2D | null)[]): number | null {
	for (let index = centroids.length - 1; index >= 0; index--) {
		if (centroids[index]) return index
	}

	return null
}

/**
 * The nearest region bearing `action` from `from`, or `null` when the wedge in
 * that direction is empty — the edge of the map, where the cursor holds rather
 * than wraps, the clamp a chart's category step keeps. Distance is compared
 * squared, so the scan takes no square root.
 *
 * @internal
 */
export function stepRegion(
	centroids: (MapPoint2D | null)[],
	from: number,
	action: MapCompassAction,
): number | null {
	const origin = centroids[from]

	if (!origin) return null

	let best: number | null = null

	let bestDistance = Number.POSITIVE_INFINITY

	for (const [index, centroid] of centroids.entries()) {
		if (!centroid || index === from) continue

		const dx = centroid.x - origin.x

		const dy = centroid.y - origin.y

		if (!bears(dx, dy, action)) continue

		const distance = dx * dx + dy * dy

		if (distance < bestDistance) {
			best = index

			bestDistance = distance
		}
	}

	return best
}

/** The outcome of a keypress: whether it drove the cursor, and where the cursor lands. @internal */
export type MapCursorMove = {
	/** True when the key drove navigation, so the caller suppresses the browser default. */
	handled: boolean
	/** The next cursor, or `null` to clear it. */
	cursor: number | null
}

/**
 * Resolves a keypress to the next cursor. An arrow from rest — or off a region
 * the geometry has since dropped — enters at the first drawn region rather than
 * stepping past it, the way a chart's first arrow enters at its first point;
 * from there each arrow moves to the nearest region bearing that way, and holds
 * at the edge rather than wrapping to the far side, which would read as a jump.
 * Home and End go to the ends of the atlas's own order. Unhandled keys pass
 * through untouched.
 *
 * @internal
 */
export function moveMapCursor(
	cursor: number | null,
	key: string,
	centroids: (MapPoint2D | null)[],
): MapCursorMove {
	const action = keyAction(key)

	if (action === null) return { handled: false, cursor }

	if (action === 'clear') return { handled: true, cursor: null }

	if (action === 'first') return { handled: true, cursor: firstRegion(centroids) }

	if (action === 'last') return { handled: true, cursor: lastRegion(centroids) }

	const base = cursor !== null && centroids[cursor] ? cursor : null

	if (base === null) return { handled: true, cursor: firstRegion(centroids) }

	return { handled: true, cursor: stepRegion(centroids, base, action) ?? base }
}
