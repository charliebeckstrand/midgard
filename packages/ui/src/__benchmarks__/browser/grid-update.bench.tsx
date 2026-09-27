/**
 * Data-refresh cost on a live grid — the polling dashboard path. Each
 * scenario mounts the grid once (top-level await; the grid stays up for the
 * whole run) and each iteration swaps in the other of two same-id datasets,
 * so every refresh moves real cell values through stable row identities and
 * never bails on an equality guard. The ui grid re-renders through its React
 * root. The iteration settles when the incoming dataset's reference cells
 * paint.
 */

import { describe } from 'vitest'
import { type Shipment, shipments } from '../fixtures'
import { prepareGrids } from './grid-harness'
import { painted } from './grids'
import { benches, frame, WINDOW } from './harness'

/** Mounts the grid on dataset `a` and closes it over an a/b swap. */
function refresh(a: Shipment[], b: Shipment[]) {
	return prepareGrids(a, (grid, box) => {
		let flip = false

		return async () => {
			flip = !flip

			const next = flip ? b : a

			grid.update(next)

			await painted(box, [next[0]?.reference ?? '', next[8]?.reference ?? ''])

			// Yield one real frame per refresh, the way a polling dashboard paints
			// between updates. The `flushSync` commit of the ui grid otherwise
			// settles in zero frames, so many iterations chain in one tick with no
			// yield. React counts those as nested updates and trips its depth guard
			// on the benign post-commit re-render of the grid. The frame is
			// near-free with the frame-rate limit off (see the bench config).
			await frame()
		}
	})
}

const rows10k = await refresh(shipments(10_000, 1), shipments(10_000, 2))

const rows100k = await refresh(shipments(100_000, 1), shipments(100_000, 2))

describe('grid update · 10,000 rows × 8 cols', () => {
	benches(rows10k, WINDOW.slow)
})

describe('grid update · 100,000 rows × 8 cols', () => {
	benches(rows100k, WINDOW.slow)
})
