/**
 * One keypress resolved to the next stop — the whole of what the plot region's
 * handler asks the engine. The key table (`keys.ts`) and the compass step
 * (`step.ts`) meet here, so the hook drives a cursor without holding either.
 */

import { keyAction } from './keys'
import { stepNearest } from './step'
import type { MapStop } from './stops'

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
