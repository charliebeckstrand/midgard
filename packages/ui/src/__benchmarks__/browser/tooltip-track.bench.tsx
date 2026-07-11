/**
 * Isolates the point-anchored tooltip's per-open cost — the work the hover
 * sweep can't see, because a sweep holds one tooltip open and never exercises
 * the open/close path. One iteration mounts a `<TooltipPointer>` open at a
 * point, repositions it across `MOVES` moves, then tears it down with a hard
 * `root.unmount()` (synchronous cleanup, so `autoUpdate`'s teardown runs
 * without waiting on the exit animation).
 *
 * `track: 'auto'` wires floating-ui's `autoUpdate` on every open — an
 * IntersectionObserver + a ResizeObserver + ancestor scroll/resize listeners,
 * set up on mount and torn down on unmount. `track: 'point'` drops them for a
 * surface that already repositions on each point change. The enter-motion cost
 * is identical for both bars, so it cancels: the gap between them is the
 * observer setup/teardown alone.
 */

import { useState } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { bench, describe } from 'vitest'
import { TooltipPointer } from '../../components/tooltip/tooltip-pointer'

type Track = 'auto' | 'point'

/** Hands the bench a `move` it can call to reposition the mounted tooltip. */
type Driver = { move: (x: number, y: number) => void }

/** One mounted, open tooltip whose anchor point the bench drives. */
function Probe({ track, register }: { track: Track; register: (driver: Driver) => void }) {
	const [point, setPoint] = useState<{ x: number; y: number }>({ x: 100, y: 100 })

	register({ move: (x, y) => setPoint({ x, y }) })

	return (
		<TooltipPointer open point={point} track={track} size="sm">
			<div aria-hidden="true">readout</div>
		</TooltipPointer>
	)
}

/** Moves per iteration — enough that any per-move observer work accumulates. */
const MOVES = 8

/** One open → reposition → teardown cycle in a throwaway root. */
function cycle(track: Track) {
	const host = document.createElement('div')

	document.body.append(host)

	const root = createRoot(host)

	let driver: Driver | null = null

	flushSync(() => {
		root.render(
			<Probe
				track={track}
				register={(next) => {
					driver = next
				}}
			/>,
		)
	})

	for (let move = 0; move < MOVES; move++) {
		flushSync(() => driver?.move(100 + move * 6, 100 + move * 4))
	}

	root.unmount()

	host.remove()
}

// A cycle runs sub-millisecond, so the default 500ms window already takes
// thousands of samples; a wider one tightens the mean the small delta needs.
const WINDOW = { time: 2_500 }

describe('tooltip · point-anchored · open + 8 moves + teardown', () => {
	bench('track: auto (autoUpdate)', () => cycle('auto'), WINDOW)

	bench('track: point', () => cycle('point'), WINDOW)
})
