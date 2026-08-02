/**
 * Scroll-sweep cost on a live grid — the virtualization stress that decides
 * whether a hundred-thousand-row grid feels instant. Each iteration steps
 * the scroll container from top to bottom and back in `STEPS` even jumps,
 * yielding one animation frame per step so every contender's scroll handler,
 * window recompute, and row recycling land inside the timed region, then
 * settles until the terminal rows actually paint — a grid may leave blanks
 * mid-flight, but the sweep is not over until the far end is drawn.
 *
 * Two contenders only: MUI X's MIT tier paginates at 100 rows per page (the
 * unpaginated scroll is Pro-licensed), so there is no full-set scroll to
 * measure and its adapter returns no scroller — see `grid-contenders.tsx`.
 */

import { describe } from 'vitest'
import { type Shipment, shipments } from '../fixtures'
import { painted } from './grid-contenders'
import { prepareGrids } from './grid-harness'
import { benches, frame, WINDOW } from './harness'

const STEPS = 12

/** Steps a scroller from one end of its range to the other, one settled frame per jump. */
async function jump(scroller: HTMLElement, from: number, to: number) {
	const max = scroller.scrollHeight - scroller.clientHeight

	const direction = to > from ? 1 : -1

	for (let step = from + direction; step !== to + direction; step += direction) {
		scroller.scrollTop = (max * step) / STEPS

		await frame()
	}
}

/** Mounts every scrollable contender and closes each over a full round trip. */
function roundTrip(rows: Shipment[]) {
	const top = [rows[0]?.id ?? '']

	const bottom = [rows[rows.length - 1]?.id ?? '']

	return prepareGrids(rows, (grid, box) => {
		const scroller = grid.scroller()

		if (!scroller) return null

		return async () => {
			await jump(scroller, 0, STEPS)

			await painted(box, bottom)

			await jump(scroller, STEPS, 0)

			await painted(box, top)
		}
	})
}

const rows10k = await roundTrip(shipments(10_000))

const rows100k = await roundTrip(shipments(100_000))

describe('grid scroll · 10,000 rows · full round trip', () => {
	benches(rows10k, WINDOW.settled)
})

describe('grid scroll · 100,000 rows · full round trip', () => {
	benches(rows100k, WINDOW.settled)
})
