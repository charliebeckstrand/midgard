/**
 * The stop list the keyboard cursor walks: every drawn region and every drawn
 * overlay mark, flattened into one field in frame coordinates. Building it here
 * rather than at either reader is what lets the cursor cross geography and
 * overlays the way the pointer does.
 */

import type { MapHoverTarget } from '../map-hover/target'
import type { MapOverlayEntry } from '../map-overlay/entry'
import type { LngLat, MapPoint2D } from '../types'

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
 * or neither.
 *
 * @internal
 */
export type MapStop = {
	target: MapHoverTarget
	at: MapPoint2D
}

/** As much of a registered mark as its stops need. @internal */
type MapAnchoredEntry = Pick<MapOverlayEntry, 'id' | 'stopsAt'>

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

		// A mark holds one stop, or one per dot where it is plural — and the stop
		// keeps its own ordinal even when an earlier one drops off the projection,
		// so the index the cursor reports always names the caller's own point.
		for (const [stop, at] of entry.stopsAt().entries()) {
			const point = project(at)

			if (point !== null) stops.push({ target: { kind: 'entry', id: entry.id, stop }, at: point })
		}
	}

	return stops
}
