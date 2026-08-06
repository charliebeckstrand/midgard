/**
 * Pure cursor math for the map module's keyboard navigation: the stop list the
 * cursor walks, and the compass step across it. Kept React-free beside
 * `map-geometry.ts` and `map-projection.ts`, so the math is unit-testable in
 * isolation. The frame-to-client conversion the cursor anchors through is
 * projection math, and lives with the rest of it in `map-projection.ts`.
 */

import type { MapHoverTarget } from './context'
import type { MapPoint2D } from './map-geometry'
import type { LngLat } from './types'
import type { MapOverlayEntry } from './use-map-legend-registry'

/**
 * One place the keyboard cursor can stand, in frame coordinates: a region at its
 * centroid, or an overlay mark at its own anchor. The list is flat and already
 * filtered — a region the geometry dropped, a mark the projection has no image
 * for, and a mark the legend has toggled off never become stops — so the cursor
 * steps geography and overlays as one field, the way the pointer crosses them,
 * and only ever stands where the map draws.
 *
 * The target is {@link MapHoverTarget} itself, not a copy of its shape: the hook
 * hands it straight to the hover context, so a third mark kind must reach both
 * or neither. The import is type-only, so it costs this module's React-free rule
 * nothing.
 *
 * @internal
 */
export type MapStop = {
	target: MapHoverTarget
	at: MapPoint2D
}

/** As much of a registered mark as a stop needs. @internal */
type MapAnchoredEntry = Pick<MapOverlayEntry, 'id' | 'anchorAt'>

/**
 * The cursor's stop list: every region at its centroid, then every registered
 * overlay at its own anchor, each projected to frame coordinates. Regions lead,
 * so Home and End read as the geography's own ends and the marks drawn over it
 * follow.
 *
 * Three things keep a stop out, and each is a place the map draws nothing: a
 * region whose geometry carries no centroid, a mark the projection has no image
 * for (the US composite drops points outside its insets), and a mark the legend
 * has toggled off, which unmounts its shapes while its registration stands. A
 * toggled-off region is not one of them — it still paints, in the neutral
 * fill — so the geography stays whole under the cursor.
 *
 * @internal
 */
export function mapStops(
	centroids: (LngLat | null)[],
	entries: readonly MapAnchoredEntry[],
	hidden: ReadonlySet<string>,
	project: (position: LngLat) => MapPoint2D | null,
): MapStop[] {
	const stops: MapStop[] = []

	for (const [index, at] of centroids.entries()) {
		const point = at === null ? null : project(at)

		if (point !== null) stops.push({ target: { kind: 'region', index }, at: point })
	}

	for (const entry of entries) {
		if (hidden.has(entry.id)) continue

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
