/**
 * The overlay ledger's data shape — what a mark registers with the plat, and
 * what every reader of that ledger reads. Held in the engine rather than with
 * the hook that owns the list (`use-map-legend-registry.ts`), because the
 * readout, the selection, and the keyboard cursor all resolve against this
 * shape and none of them needs React to do it.
 */

import type { MapSeriesColor } from '../../../../recipes/kata/map'
import type { LngLat, MapPoint2D, MapSwatchShape } from '../types'

/** The overlay kinds that register legend entries. @internal */
export type MapOverlayKind = 'route' | 'point' | 'marker' | 'geofence'

/**
 * One stop's own readout. Either field may stand alone: a dot that carries a
 * count but no name of its own is as ordinary as one that carries a name.
 *
 * @internal
 */
export type MapStopRow = {
	label?: string
	detail?: string
}

/**
 * One overlay mark's registration: what the legend draws for it, and what the
 * keyboard cursor needs to stand on it. The plat resolves slot colours across
 * the registered order, after the region categories.
 *
 * The ledger is one list rather than two. A second registry for the cursor would
 * double the state commits per mark and split one identity across two lists that
 * must hold the same order — so the legend and the cursor read the same entry.
 *
 * @internal
 */
export type MapOverlayEntry = {
	/** The mark's identity: its caller-supplied `id`, else a generated one. Re-registering replaces in place. */
	id: string
	/** Legend and tooltip name. */
	label: string
	kind: MapOverlayKind
	swatch: MapSwatchShape
	/** Named mark colour override; defaults to the next slot after the categories. */
	color?: MapSeriesColor
	/** A trailing readout — a route's mileage, a point's value. */
	detail?: string
	/**
	 * Every place the keyboard cursor can stand on this mark, in lon/lat: one for
	 * a singular mark, one per dot for a plural one, and none where the mark has
	 * no geometry yet.
	 *
	 * A getter rather than a value, and stable across renders, so a mark that
	 * moves — a route whose geometry lands from the network — needs no
	 * re-registration, and an inline `at={[lon, lat]}` never churns the ledger.
	 *
	 * Required, like the sibling `stopOf`: one hook registers every mark on the
	 * map and it always passes this, so an optional field only bought the reader
	 * a fallback for a mark that cannot exist. A mark with no geometry yet
	 * answers with the empty list.
	 */
	stopsAt: () => LngLat[]
	/**
	 * What each of this mark's stops reads out, where that differs from the mark's
	 * own `label` and `detail` — a plural mark's dots, each naming its own stop.
	 * Absent on every singular mark, whose one stop reads the mark.
	 *
	 * Plain data, not a getter like {@link stopsAt}: the table draws this during
	 * its own render, so it has to change the ledger to reach the screen. The
	 * positions can stay behind a getter because nothing draws them — the cursor
	 * reads them on a keypress.
	 */
	stopRows?: MapStopRow[]
	/**
	 * Picks one of the mark's stops: what Enter or Space calls with the keyboard
	 * cursor on it, and what a click reports. Stable like {@link stopsAt}, and
	 * registered only where the mark answers a pick — so its presence is the
	 * question the plat's tab-stop gate asks.
	 */
	activate?: (stop: number) => void
	/**
	 * The reach, in device pixels, a dot at this frame position may take before it
	 * starts eating ground this mark needs to stay pointable — `Infinity` where the
	 * dot competes with nothing here, the identity of the minimum the plat folds
	 * these into. Registered by the area-shaped marks alone, which spares the plat
	 * a call per dot for every mark that holds no ground; absence and a claim of
	 * `Infinity` are the same answer, so the gate is a cost the ledger declines to
	 * pay rather than a distinction the rule reads.
	 *
	 * A measure rather than a membership, because the question a dot is really
	 * asking is how much room it has, and the in-or-out form could not answer it
	 * at the boundary — which is exactly where a zone drawn through its own marks
	 * puts them. A ray cast at a vertex is decided by the ring's winding and its
	 * concavity, so four corners of one zone answered four different ways.
	 *
	 * Stable like {@link stopsAt}, and reading the mark's live geometry, so a zone
	 * that moves or is redrawn never re-registers — the ledger's every write
	 * re-sorts it and re-renders the legend, which a field typed into would
	 * otherwise pay on each keystroke.
	 */
	spare?: (at: MapPoint2D) => number
	/**
	 * Which drawn stop holds an index the mark reported — the two part on a
	 * {@link MapPoints}, whose clicks name a dot in the caller's own points while
	 * its stops are the drawn groups those dots merged into. `null` where the mark
	 * has no stop for that index.
	 *
	 * Every mark registers one, `ownStop` where it draws the stops it reports, so
	 * the plat asks one question of every entry to mark the picked stop's table
	 * row. Stable like {@link stopsAt}, so a regrouping never re-registers; the
	 * mark itself resolves off the live grouping it holds.
	 */
	stopOf: (index: number) => number | null
}
