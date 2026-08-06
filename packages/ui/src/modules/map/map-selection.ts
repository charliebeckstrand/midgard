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
import type { MapOverlaySelection } from './types'
import type { MapOverlayEntry } from './use-map-legend-registry'

/**
 * The stop mapper a mark registers when it draws the stops it reports: its one
 * stop is index `0`, and any other index names nothing — the silence a
 * `selectedRegion` naming no region keeps, rather than a mark haloed for an
 * index it never had.
 *
 * @internal
 */
export function ownStop(index: number): number | null {
	return index === 0 ? 0 : null
}

/**
 * Which of a mark's drawn stops a pick names, `null` where the pick names
 * another mark or a stop this one does not draw.
 *
 * The caller's index is optional and reads as the mark's first stop, which is
 * the whole of a singular mark. That default lives here rather than at either
 * reader, so the halo and the table row can only ever resolve one dot.
 *
 * @internal
 */
export function pickedStop(
	selection: MapOverlaySelection | null,
	id: string,
	stopOf: (index: number) => number | null,
): number | null {
	if (selection === null || selection.id !== id) return null

	return stopOf(selection.index ?? 0)
}

/**
 * The table row key a pick marks, or `null` where it marks none — an id no mark
 * registered, or a stop the named mark does not draw. Resolved through the
 * mark's own registered mapper, the same one the mark reads for its halo.
 *
 * @internal
 */
export function selectedMarkRow(
	entries: readonly MapOverlayEntry[],
	selection: MapOverlaySelection | null,
): string | null {
	if (selection === null) return null

	const entry = entries.find((candidate) => candidate.id === selection.id)

	if (entry === undefined) return null

	const stop = pickedStop(selection, entry.id, entry.stopOf)

	return stop === null ? null : markRowKey(entry.id, stop)
}
