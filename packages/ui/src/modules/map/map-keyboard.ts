/**
 * Pure cursor math for the map module's keyboard navigation: the compass step
 * over projected region centroids. Kept React-free beside `map-geometry.ts` and
 * `map-projection.ts`, so the math is unit-testable in isolation. The
 * frame-to-client conversion the cursor anchors through is projection math, and
 * lives with the rest of it in `map-projection.ts`.
 */

import type { MapPoint2D } from './map-geometry'
import type { LngLat } from './types'

/**
 * One place the keyboard cursor can stand, in frame coordinates: a region at its
 * centroid, or an overlay mark at its own anchor. The list is flat and already
 * filtered — a region the geometry dropped, or a mark the projection has no
 * image for, never becomes a stop — so the cursor steps geography and overlays
 * as one field, the way the pointer crosses them.
 *
 * @internal
 */
export type MapStop = {
	/** What the stop reports as the hover target — the plat resolves what to do with it. */
	target: { kind: 'region'; index: number } | { kind: 'entry'; id: string }
	at: MapPoint2D
}

/** As much of a registered overlay as a stop needs: its identity and its anchor. @internal */
type MapAnchoredEntry = {
	id: string
	anchorAt?: () => LngLat | null
}

/**
 * The cursor's stop list: every region at its centroid, then every registered
 * overlay at its own anchor, each projected to frame coordinates. Regions lead,
 * so Home and End read as the geography's own ends and the marks drawn over it
 * follow.
 *
 * A stop the projection has no image for is left out — the US composite drops
 * points outside its insets — so the cursor never lands where the map draws
 * nothing, and the list needs no sparse slots.
 *
 * @internal
 */
export function mapStops(
	centroids: (LngLat | null)[],
	entries: readonly MapAnchoredEntry[],
	project: (position: LngLat) => MapPoint2D | null,
): MapStop[] {
	const stops: MapStop[] = []

	for (const [index, at] of centroids.entries()) {
		const point = at === null ? null : project(at)

		if (point !== null) stops.push({ target: { kind: 'region', index }, at: point })
	}

	for (const entry of entries) {
		const at = entry.anchorAt?.() ?? null

		const point = at === null ? null : project(at)

		if (point !== null) stops.push({ target: { kind: 'entry', id: entry.id }, at: point })
	}

	return stops
}

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
export function stepStop(stops: MapStop[], from: number, action: MapCompassAction): number | null {
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
	/** Index into the stop list, or `null` to clear the cursor. */
	stop: number | null
}

/** The first stop, or `null` when there is nothing to navigate. */
function edge(stops: MapStop[], dir: 1 | -1): number | null {
	if (stops.length === 0) return null

	return dir === 1 ? 0 : stops.length - 1
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
 * @internal
 */
export function moveMapCursor(cursor: number | null, key: string, stops: MapStop[]): MapCursorMove {
	const action = keyAction(key)

	if (action === null) return { handled: false, stop: cursor }

	if (action === 'clear') return { handled: true, stop: null }

	if (action === 'first') return { handled: true, stop: edge(stops, 1) }

	if (action === 'last') return { handled: true, stop: edge(stops, -1) }

	const base = cursor !== null && stops[cursor] ? cursor : null

	if (base === null) return { handled: true, stop: edge(stops, 1) }

	return { handled: true, stop: stepStop(stops, base, action) ?? base }
}
