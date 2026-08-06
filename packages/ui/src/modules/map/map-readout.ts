/**
 * The one resolution of what an overlay mark's stop reads out. The tooltip and
 * the visually-hidden table are two renderings of one readout, so they must not
 * each carry their own ladder of fallbacks — the pointer and a screen reader
 * would then disagree about the same dot, which is the failure this file exists
 * to prevent.
 *
 * React-free beside the module's other pure helpers, so the rule is testable
 * without mounting either surface.
 */

import type { MapStopRow } from './use-map-legend-registry'

/** As much of a registered mark as its readout needs. @internal */
type MapReadableMark = {
	label: string
	detail?: string
	kind: string
	stopRows?: MapStopRow[]
}

/** What one stop of a mark says: its name, and an optional trailing readout. @internal */
export type MapMarkReadout = {
	name: string
	detail?: string
}

/**
 * What one of a mark's stops reads out.
 *
 * A singular mark has no rows, so every stop of it reads the mark's own name and
 * detail.
 *
 * A plural mark's dot reads its own name, or is numbered within its group where
 * it carries none — a reader has no position to tell two unnamed dots apart by,
 * so `Stops 3` beats three rows all reading `Stops`. Its detail never falls back
 * to the mark's: the set's detail describes the set, so a dot with no count of
 * its own showing the group's `10 stops` would misreport that dot.
 *
 * @internal
 */
export function markReadout(mark: MapReadableMark, stop: number): MapMarkReadout {
	const row = mark.stopRows?.[stop]

	if (row === undefined) return { name: mark.label, detail: mark.detail }

	return { name: row.label ?? `${mark.label} ${stop + 1}`, detail: row.detail }
}

/** One table row: a readout, and the key identifying which stop it came from. @internal */
export type MapMarkRow = MapMarkReadout & {
	key: string
}

/**
 * Every row a mark contributes to the data table: one for a singular mark, one
 * per dot for a plural one, so a reader gets the per-dot readout the pointer
 * gets from the tooltip.
 *
 * A mark with no detail anywhere falls back to its kind — `route`, `point` — so
 * the value column is never empty. Each row carries its own key, built from the
 * mark and the stop ordinal, which is the dot's identity everywhere else in the
 * module: the caller then needs no index of its own to key by. The tooltip needs
 * no key, so only this half of the pair asks for the mark's id.
 *
 * @internal
 */
export function markRows(mark: MapReadableMark & { id: string }): MapMarkRow[] {
	const count = mark.stopRows?.length ?? 0

	return Array.from({ length: Math.max(count, 1) }, (_, stop) => {
		const readout = markReadout(mark, stop)

		return { key: `${mark.id}:${stop}`, name: readout.name, detail: readout.detail ?? mark.kind }
	})
}
