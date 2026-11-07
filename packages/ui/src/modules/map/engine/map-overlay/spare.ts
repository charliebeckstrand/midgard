/**
 * The resolver of the room that the ground under a dot leaves its target, as a store. The plat
 * folds the claims of the region layer and of each visible zone into one resolver. A dot-shaped
 * mark reads it to size its hit target.
 *
 * A listener set, React-free, like the rest of the engine.
 */

import { createEmitter } from '../../../../utilities/emitter'
import type { MapPoint2D } from '../types'

/**
 * How much reach the ground leaves a mark at a frame position, in device pixels.
 *
 * @internal
 */
export type MapSpareResolver = (at: MapPoint2D, unitsPerPixel: number) => number

/**
 * The resolver of a plat, as a store that a mark reads through `useSyncExternalStore`.
 *
 * @remarks
 * The plat makes a new store each time its ledger, its toggles, or its region layer change. A zone
 * whose ground changes changes none of these. It registers its budget behind a stable getter, so
 * that a redrawn zone does not write the ledger again (`MapOverlayEntry.spare`). The zone therefore
 * calls {@link MapSpareStore.reground} when its budget changes. The store then gives its readers a
 * new resolver, and each dot measures its target again.
 *
 * @internal
 */
export type MapSpareStore = {
	/**
	 * The snapshot: the resolver. The identity of this function changes with each reground, so a
	 * reader can hold its result in a memo.
	 */
	spare: () => MapSpareResolver
	/** Calls `listener` after each reground, and returns the unsubscribe. */
	subscribe: (listener: () => void) => () => void
	/** Records that the budget of a zone changed. */
	reground: () => void
}

/**
 * A new {@link MapSpareStore} over the resolver of a plat.
 *
 * @param resolve - The resolver, which reads the live budget of each zone.
 * @returns The store.
 * @internal
 */
export function createSpareStore(resolve: MapSpareResolver): MapSpareStore {
	const changed = createEmitter()

	let spare = resolve

	return {
		spare: () => spare,
		subscribe: changed.subscribe,
		reground: () => {
			spare = (at, unitsPerPixel) => resolve(at, unitsPerPixel)

			changed.emit()
		},
	}
}
