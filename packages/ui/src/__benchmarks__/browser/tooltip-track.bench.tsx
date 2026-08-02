/**
 * Isolates the point-anchored tooltip's per-open cost — the work the hover
 * sweep can't see, because a sweep holds one tooltip open and never exercises
 * the open/close path. One iteration mounts a `<TooltipPointer>` open at a
 * point, repositions it across `MOVES` moves, then tears it down hard
 * (synchronous cleanup, so `autoUpdate`'s teardown runs without waiting on the
 * exit animation).
 *
 * `track: 'auto'` wires floating-ui's `autoUpdate` on every open — an
 * IntersectionObserver + a ResizeObserver + ancestor scroll/resize listeners,
 * set up on mount and torn down on unmount. `track: 'point'` drops them for a
 * surface that already repositions on each point change. The enter-motion cost
 * is identical for both bars, so it cancels: the gap between them is the
 * observer setup/teardown alone.
 */

import { bench, describe } from 'vitest'
import { reactHost, WINDOW } from './harness'
import { type Move, Probe, type Track } from './tooltip-probe'

/** Moves per iteration — enough that any per-move observer work accumulates. */
const MOVES = 8

/** One open → reposition → teardown cycle in a throwaway root. */
function cycle(track: Track) {
	const mounted = reactHost()

	let move: Move = () => {}

	mounted.render(
		<Probe
			track={track}
			register={(next) => {
				move = next
			}}
		/>,
	)

	for (let step = 0; step < MOVES; step++) {
		mounted.flush(() => move(100 + step * 6, 100 + step * 4))
	}

	mounted.destroy()
}

// A cycle runs sub-millisecond, so the default 500ms window already takes
// thousands of samples; a wider one tightens the mean the small delta needs.
describe(`tooltip · point-anchored · open + ${MOVES} moves + teardown`, () => {
	bench('track: auto (autoUpdate)', () => cycle('auto'), WINDOW.settled)

	bench('track: point', () => cycle('point'), WINDOW.settled)
})
