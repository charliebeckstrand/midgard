/**
 * The mounted, open tooltip both tooltip benches drive. Held in one place
 * because the two measure different things through the same surface: the
 * lifecycle bench bounds a full build-and-teardown cycle, the track bench the
 * per-open observer cost of `track: 'auto'` against `track: 'point'`.
 */

import { useState } from 'react'
import { TooltipPointer } from '../../components/tooltip/tooltip-pointer'

/** How the surface follows its anchor: floating-ui's `autoUpdate`, or the point alone. */
export type Track = 'auto' | 'point'

/** Hands the bench a `move` it can call to reposition the mounted tooltip. */
export type Driver = { move: (x: number, y: number) => void }

/** One mounted, open tooltip whose anchor point the bench drives. */
export function Probe({ track, register }: { track?: Track; register: (driver: Driver) => void }) {
	const [point, setPoint] = useState<{ x: number; y: number }>({ x: 100, y: 100 })

	register({ move: (x, y) => setPoint({ x, y }) })

	return (
		<TooltipPointer open point={point} track={track} size="sm">
			<div aria-hidden="true">readout</div>
		</TooltipPointer>
	)
}
