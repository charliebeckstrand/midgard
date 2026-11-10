/**
 * The dots of every visible dot-drawing mark on a plat, projected into frame units, each with the
 * radius it paints at. A dot-shaped
 * mark divides its target's ground against this pool, with its own dots left out (see `ground.ts`).
 *
 * Frame arithmetic and a listener set, React-free, like the rest of the engine.
 */

import { createEmitter } from '../../../../utilities/emitter'
import { getOrCompute } from '../../../../utilities/get-or-compute'
import type { MapOverlayAnchor } from '../map-overlay/entry'
import type { MapProjector } from '../types'
import type { MapGroundDot } from './ground'

/**
 * The pool of a plat, as a store that a mark reads through `useSyncExternalStore`.
 *
 * @remarks
 * The plat makes a new pool each time the anchors of its ledger (`sameAnchors`), its toggles, or
 * its fit change. A mark that moves changes none of these. Its stops sit behind a stable getter, so
 * that a move does not write the ledger again. The mark therefore calls
 * {@link MapDotPool.restake} when its stops change. The pool then gathers that mark again, and
 * tells its readers only when the dots of that mark moved or resized.
 *
 * Each mark reads its own view of the pool. The view of a mark holds no dot of that mark, so a
 * restake changes the view of each other mark and keeps the view of the mark that moved.
 *
 * @internal
 */
export type MapDotPool = {
	/**
	 * The snapshot for the mark that `id` names: a function that gives the dots of every OTHER mark.
	 * The identity of that function changes each time the dots of another mark change, so a reader
	 * can hold its result in a memo. The function is lazy, because the first call gathers the pool.
	 */
	neighbors: (id: string) => () => MapGroundDot[]
	/** Calls `listener` each time the pool changes, and returns the unsubscribe. */
	subscribe: (listener: () => void) => () => void
	/** Gathers the dots of the mark that `id` names again, after its stops changed. */
	restake: (id: string) => void
}

/**
 * A new {@link MapDotPool} over the entries of a ledger.
 *
 * The first read gathers the whole pool, and the pool holds that gather. The gather invokes each
 * entry's `dotsAt`. `MapPoints` registers that as a thunk. Thus the O(N) build, and the spherical
 * centroid behind the anchor of each summary, land on the one reader that wants them. A plat with
 * no dot-shaped mark therefore never gathers. M marks share one gather, and each drops only its
 * own dots from it.
 *
 * A restake before the first read does nothing, because no reader holds a gather yet. After it, a
 * restake gathers the one mark again. It changes the pool only when a dot of that mark moved or
 * resized. A mark whose stops change identity but not position therefore renders no reader. A mark
 * whose dots did move renders each other reader, and not itself.
 *
 * @param entries - The ledger.
 * @param hidden - The ids that the legend has toggled off.
 * @param project - The live projection.
 * @returns The pool.
 * @internal
 */
export function createDotPool(
	entries: readonly MapOverlayAnchor[],
	hidden: ReadonlySet<string>,
	project: MapProjector,
): MapDotPool {
	const changed = createEmitter()

	let held: ReadonlyMap<string, readonly MapGroundDot[]> | null = null

	const gathered = () => {
		if (held === null) held = gatherDots(entries, hidden, project)

		return held
	}

	// The view of each mark that asked, by its id. A view reads the live gather, so a view that the
	// pool keeps through a restake still gives the dots as they stand.
	const views = new Map<string, () => MapGroundDot[]>()

	// Walked rather than mapped: every dot on the map is tested per asking mark, and a `flatMap`
	// would make an array per mark only to flatten them all away again.
	const bind = (exclude: string) => () => {
		const others: MapGroundDot[] = []

		for (const [owner, dots] of gathered()) {
			if (owner !== exclude) for (const dot of dots) others.push(dot)
		}

		return others
	}

	return {
		neighbors: (id) => getOrCompute(views, id, bind),
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

			// The view of this mark holds none of its dots, so it stays. Each other view goes, and
			// its reader gets a new one.
			const own = views.get(id)

			views.clear()

			if (own !== undefined) views.set(id, own)

			changed.emit()
		},
	}
}

/**
 * Every visible dot-drawing mark's dots, projected into frame units, by the mark's id. A mark that
 * draws no dot has no key.
 *
 * @internal
 */
function gatherDots(
	entries: readonly MapOverlayAnchor[],
	hidden: ReadonlySet<string>,
	project: MapProjector,
): Map<string, readonly MapGroundDot[]> {
	const pool = new Map<string, readonly MapGroundDot[]>()

	for (const entry of entries) {
		const dots = entryDots(entry, hidden, project)

		if (dots !== undefined) pool.set(entry.id, dots)
	}

	return pool
}

/**
 * The dots one mark puts in the pool, or `undefined` where it puts none.
 *
 * Skips hidden marks, which hold no ground while the legend has them away, and marks with no
 * `dotsAt`, which draw no dots. A zone's claim on the ground is a `spare` budget rather than a
 * boundary.
 *
 * Off-projection dots are dropped: they draw nothing, so they crowd nothing; the US composite
 * drops points outside its insets.
 *
 * @internal
 */
function entryDots(
	entry: MapOverlayAnchor,
	hidden: ReadonlySet<string>,
	project: MapProjector,
): MapGroundDot[] | undefined {
	if (hidden.has(entry.id) || !entry.dotsAt) return undefined

	const dots: MapGroundDot[] = []

	for (const dot of entry.dotsAt()) {
		const at = project(dot.at)

		if (at !== null) dots.push({ at, radius: dot.radius })
	}

	return dots
}

/** Whether two lists of dots stand at the same positions at the same radii, in order. @internal */
function sameDots(
	prev: readonly MapGroundDot[] | undefined,
	next: readonly MapGroundDot[] | undefined,
): boolean {
	if (prev === undefined || next === undefined) return prev === next

	return (
		prev.length === next.length &&
		next.every(({ at, radius }, index) => {
			const was = prev[index]

			return at.x === was?.at.x && at.y === was.at.y && radius === was.radius
		})
	)
}
