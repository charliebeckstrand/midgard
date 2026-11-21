/**
 * The one resolution of what the standing picks name on the overlays. A pick has
 * to reach two surfaces: the halo behind the mark, and the selected text on the
 * mark's table row. Those two must never name different stops, which is the
 * failure this file exists to prevent. The picture would then mark one dot while
 * a screen reader read another.
 *
 * React-free beside the module's other pure helpers, so the rule is testable
 * without mounting a map.
 */

import type { MapOverlayTarget } from '../map-hover/target'
import type { MapOverlaySelection } from '../types'
import type { MapOverlayEntry, MapStopPart } from './entry'
import { markRowKey } from './readout'

/**
 * The stop mapper a mark registers when it draws the stops it reports. Its one
 * stop is index `0`, and any other index names nothing. That is the silence a
 * `selectedRegions` entry naming no region keeps, rather than a mark haloed for an
 * index it never had.
 *
 * @internal
 */
export function ownStop(index: number): number | null {
	return index === 0 ? 0 : null
}

/**
 * Which of a mark's drawn stops the picks name, in ascending order and each one
 * time. A pick that names another mark, or an index the mark has no stop for,
 * adds nothing. A stop of a shared summary that another set draws still counts,
 * because the pick names the part of this set that the summary holds. Two picks
 * that land in one summary name that stop one time.
 *
 * The index of a pick is optional and reads as the first stop of the mark, which
 * is the whole of a singular mark. That default lives here rather than at either
 * reader, so the halo and the table row always resolve the same dots.
 *
 * @internal
 */
export function pickedStops(
	selections: readonly MapOverlaySelection[],
	id: string,
	getStop: (index: number) => number | null,
): readonly number[] {
	const stops = new Set<number>()

	for (const selection of selections) {
		if (selection.id !== id) continue

		const stop = getStop(selection.index ?? 0)

		if (stop !== null) stops.add(stop)
	}

	return [...stops].sort((a, b) => a - b)
}

/**
 * The drawn stop that an overlay target names now. A target that holds a
 * reported index names the stop that holds that index, because a regroup moves
 * the index to another stop. A target with no reported index, or one whose
 * index the mark no longer draws, names its own stop.
 *
 * @internal
 */
export function targetStop(
	target: MapOverlayTarget,
	getStop: (index: number) => number | null,
): number {
	return target.reported === undefined ? target.stop : (getStop(target.reported) ?? target.stop)
}

/**
 * The parts that an overlay target names. They are the parts of the shared
 * summary that holds its stop, in the order of the ledger, else its own stop.
 * The one rule by which a pick, a right-click, and the readout reach every set of
 * a shared summary, whatever input made them.
 *
 * @param target - The overlay target.
 * @param entry - The registered entry of the mark that the target names.
 * @returns The parts, each as the id of a set and a stop of that set.
 * @internal
 */
export function targetParts(
	target: MapOverlayTarget,
	entry: Pick<MapOverlayEntry, 'getStop' | 'stopRows'>,
): readonly MapStopPart[] {
	const stop = targetStop(target, entry.getStop)

	return entry.stopRows?.[stop]?.parts ?? [{ id: target.id, stop }]
}

/**
 * The table row keys that the picks mark. A pick marks no row where it names an
 * id that no mark registered, or a stop that the named mark does not draw. Each
 * key resolves through the registered mapper of the mark, the same one that the
 * mark reads for its halo.
 *
 * @internal
 */
export function selectedMarkRows(
	entries: readonly MapOverlayEntry[],
	selections: readonly MapOverlaySelection[],
): ReadonlySet<string> {
	const rows = new Set<string>()

	if (selections.length === 0) return rows

	// Filtered by the same resolution that answers the halo, rather than by an id
	// match beside it: one comparison decides which marks the picks name, so the
	// two readers cannot part over what "names" means.
	for (const entry of entries) {
		for (const stop of pickedStops(selections, entry.id, entry.getStop)) {
			rows.add(markRowKey(entry.id, stop))
		}
	}

	return rows
}

/**
 * Whether two lists of picks hold the same pairs in the same order. A caller
 * builds a new list on each render, and the plat holds the last list while the
 * pairs stay the same.
 *
 * @internal
 */
export function samePicks(
	a: readonly MapOverlaySelection[],
	b: readonly MapOverlaySelection[],
): boolean {
	if (a === b) return true

	if (a.length !== b.length) return false

	return a.every((pick, index) => pick.id === b[index]?.id && pick.index === b[index]?.index)
}
