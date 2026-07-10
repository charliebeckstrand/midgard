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
 * measure — see `grid-contenders.tsx`.
 */

import { bench, describe } from 'vitest'
import { makeShipments, type Shipment } from '../fixtures'
import { GRID_HEIGHT, GRID_WIDTH, gridContenders, painted } from './grid-contenders'

const STEPS = 12

/** Sweeps are many-frame iterations; a longer window keeps samples up. */
const SLOW = { time: 2_500 }

type PreparedBench = { name: string; run: () => Promise<void> }

/** Mounts every scrollable contender and closes each over a full round trip. */
async function prepare(rows: Shipment[]): Promise<PreparedBench[]> {
	const top = [rows[0]?.id ?? '']

	const bottom = [rows[rows.length - 1]?.id ?? '']

	const prepared: PreparedBench[] = []

	for (const contender of gridContenders()) {
		const host = document.createElement('div')

		host.style.width = `${GRID_WIDTH}px`

		host.style.height = `${GRID_HEIGHT}px`

		document.body.append(host)

		const grid = contender.mount(host, rows)

		await painted(host, top)

		const scroller = grid.scroller()

		if (!scroller) {
			host.remove()

			continue
		}

		prepared.push({
			name: contender.name,
			run: async () => {
				const max = scroller.scrollHeight - scroller.clientHeight

				for (let step = 1; step <= STEPS; step++) {
					scroller.scrollTop = (max * step) / STEPS

					await new Promise(requestAnimationFrame)
				}

				await painted(host, bottom)

				for (let step = STEPS - 1; step >= 0; step--) {
					scroller.scrollTop = (max * step) / STEPS

					await new Promise(requestAnimationFrame)
				}

				await painted(host, top)
			},
		})
	}

	return prepared
}

const rows10k = await prepare(makeShipments(10_000))

const rows100k = await prepare(makeShipments(100_000))

describe('grid scroll · 10,000 rows · full round trip', () => {
	for (const { name, run } of rows10k) {
		bench(name, run, SLOW)
	}
})

describe('grid scroll · 100,000 rows · full round trip', () => {
	for (const { name, run } of rows100k) {
		bench(name, run, SLOW)
	}
})
