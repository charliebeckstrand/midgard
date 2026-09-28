/**
 * The dots of every visible dot-drawing mark on a plat, projected into frame units. A dot-shaped
 * mark divides its target's ground against this pool, with its own dots left out — see `ground.ts`.
 *
 * Frame arithmetic and a listener set, React-free, like the rest of the engine.
 */

import { createEmitter } from '../../../../utilities'
import type { MapOverlayEntry } from '../map-overlay/entry'
import type { LngLat, MapPoint2D } from '../types'

/**
 * The pool of a plat, as a store that a mark reads through `useSyncExternalStore`.
 *
 * @remarks
 * The plat makes a new pool each time its ledger, its toggles, or its fit change. A mark that moves
 * changes none of these. Its stops sit behind a stable getter, so that a move does not write the
 * ledger again. The mark therefore calls {@link MapDotPool.restake} when its stops change. The pool
 * then gathers that mark again, and tells its readers only when the dots of that mark moved.
 *
 * @internal
 */
export type MapDotPool = {
	/**
	 * The snapshot: every OTHER mark's dots, for the mark that `exclude` names. The identity of this
	 * function changes each time the pool changes, so a reader can hold its result in a memo.
	 */
	neighbors: () => (exclude: string) => MapPoint2D[]
	/** Calls `listener` each time the pool changes, and returns the unsubscribe. */
	subscribe: (listener: () => void) => () => void
	/** Gathers the dots of the mark that `id` names again, after its stops changed. */
	restake: (id: string) => void
}

/**
 * A new {@link MapDotPool} over the entries of a ledger.
 *
 * The first read gathers the whole pool, and the pool holds that gather. The gather invokes each
 * entry's `stopsAt`. `MapPoints` registers that as a thunk, so that the O(N) build and the
 * spherical centroid behind each summary's anchor land on the one reader that wants them. A plat
 * with no dot-shaped mark therefore never gathers. M marks share one gather, and each drops only its
 * own dots from it.
 *
 * A restake before the first read does nothing, because no reader holds a gather yet. After it, a
 * restake gathers the one mark again. It changes the pool only when a dot of that mark moved. A mark
 * whose stops change identity but not position therefore renders no reader.
 *
 * @param entries - The ledger.
 * @param hidden - The ids that the legend has toggled off.
 * @param project - The live projection.
 * @returns The pool.
 * @internal
 */
export function createDotPool(
	entries: readonly MapOverlayEntry[],
	hidden: ReadonlySet<string>,
	project: (at: LngLat) => MapPoint2D | null,
): MapDotPool {
	const changed = createEmitter()

	let held: ReadonlyMap<string, readonly MapPoint2D[]> | null = null

	const gathered = () => {
		if (held === null) held = gatherDots(entries, hidden, project)

		return held
	}

	// Walked rather than mapped: every dot on the map is tested per asking mark, and a `flatMap`
	// would make an array per mark only to flatten them all away again.
	const bind = () => (exclude: string) => {
		const others: MapPoint2D[] = []

		for (const [owner, dots] of gathered()) {
			if (owner !== exclude) for (const at of dots) others.push(at)
		}

		return others
	}

	let neighbors = bind()

	return {
		neighbors: () => neighbors,
		subscribe: changed.subscribe,
		restake: (id) => {
			if (held === null) return

			const entry = entries.find((candidate) => candidate.id === id)

			const next = entry === undefined ? undefined : entryDots(entry, hidden, project)

			if (sameDots(held.get(id), next)) return

			const pool = new Map(held)

			if (next === undefined) pool.delete(id)
			else pool.set(id, next)

			held = pool

			neighbors = bind()

			changed.emit()
		},
	}
}

/**
 * Every visible dot-drawing mark's stops, projected into frame units, by the mark's id. A mark that
 * draws no dot has no key.
 *
 * @internal
 */
function gatherDots(
	entries: readonly MapOverlayEntry[],
	hidden: ReadonlySet<string>,
	project: (at: LngLat) => MapPoint2D | null,
): Map<string, readonly MapPoint2D[]> {
	const pool = new Map<string, readonly MapPoint2D[]>()

	for (const entry of entries) {
		const dots = entryDots(entry, hidden, project)

		if (dots !== undefined) pool.set(entry.id, dots)
	}

	return pool
}

/**
 * The dots one mark puts in the pool, or `undefined` where it puts none.
 *
 * Skips hidden marks, which hold no ground while the legend has them away. Skips the line and area
 * kinds. A route's waypoints and a zone's ring paint nothing a pointer could be aimed at instead
 * of. A zone's claim on the ground is a `spare` budget rather than a boundary. Read as a negative so a
 * dot-drawing kind added later joins the rule without this being edited.
 *
 * Off-projection stops are dropped — they draw nothing, so they crowd nothing; the US composite drops
 * points outside its insets.
 *
 * @internal
 */
function entryDots(
	entry: MapOverlayEntry,
	hidden: ReadonlySet<string>,
	project: (at: LngLat) => MapPoint2D | null,
): MapPoint2D[] | undefined {
	if (hidden.has(entry.id)) return undefined

	if (entry.kind === 'route' || entry.kind === 'geofence') return undefined

	const dots: MapPoint2D[] = []

	for (const stop of entry.stopsAt()) {
		const at = project(stop)

		if (at !== null) dots.push(at)
	}

	return dots
}

/** Whether two lists of dots stand at the same positions, in order. @internal */
function sameDots(
	previous: readonly MapPoint2D[] | undefined,
	next: readonly MapPoint2D[] | undefined,
): boolean {
	if (previous === undefined || next === undefined) return previous === next

	return (
		previous.length === next.length &&
		next.every((at, i) => at.x === previous[i]?.x && at.y === previous[i]?.y)
	)
}
