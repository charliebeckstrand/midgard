/**
 * The one resolution of what a standing pick names on the overlays. A pick has
 * to reach two surfaces — the halo behind the mark, and `aria-current` on the
 * mark's table row — and those two must never name different stops, which is the
 * failure this file exists to prevent: the picture would then mark one dot while
 * a screen reader read another.
 *
 * React-free beside the module's other pure helpers, so the rule is testable
 * without mounting a map.
 */

import { markRowKey } from './map-readout'
import type { MapOverlayEntry } from './use-map-legend-registry'

/**
 * The pick as everything downstream reads it: which mark, and which of its drawn
 * stops. The plat normalises the caller's optional index to a stop here, so no
 * reader tests for an absent ordinal — the discipline the hover target keeps for
 * the pointer.
 *
 * @internal
 */
export type MapMarkSelection = {
	id: string
	stop: number
}

/**
 * Which drawn stop of a mark a reported index names.
 *
 * A mark whose clicks count in another space than its stops maps the index
 * itself — a `MapPoints` reports the caller's own point and draws the groups
 * those points merged into — and answers `null` where it holds no stop for one.
 *
 * Every other mark registers exactly one stop, its own, so index `0` names it
 * and any other index names nothing: the silence a `selectedRegion` naming no
 * region keeps, rather than a mark haloed for an index it never had.
 *
 * @internal
 */
export function markStop(
	stopOf: ((index: number) => number | null) | undefined,
	index: number,
): number | null {
	if (stopOf !== undefined) return stopOf(index)

	return index === 0 ? 0 : null
}

/**
 * The table row key a pick marks, or `null` where it marks none — an id no mark
 * registered, or a stop the named mark does not draw.
 *
 * Resolved through the mark's own {@link MapOverlayEntry.stopOf}, the same
 * mapper the mark reads for its halo, so the row and the halo can only ever name
 * one dot.
 *
 * @internal
 */
export function selectedMarkRow(
	entries: readonly MapOverlayEntry[],
	selection: MapMarkSelection | null,
): string | null {
	if (selection === null) return null

	const entry = entries.find((candidate) => candidate.id === selection.id)

	if (entry === undefined) return null

	const stop = markStop(entry.stopOf, selection.stop)

	return stop === null ? null : markRowKey(entry.id, stop)
}
