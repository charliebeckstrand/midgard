/**
 * Data-refresh cost on a live grid — the polling dashboard path. Each
 * scenario mounts every contender once (top-level await; the grids stay up
 * for the whole run) and each iteration swaps in the other of two same-id
 * datasets, so every refresh moves real cell values through stable row
 * identities and never bails on an equality guard. The ui module and MUI X
 * re-render through their React roots; AG takes `setGridOption('rowData')`.
 * The iteration settles when the incoming dataset's reference cells paint.
 */

import { describe } from 'vitest'
import { type Shipment, shipments } from '../fixtures'
import { painted } from './grid-contenders'
import { prepareGrids } from './grid-harness'
import { benches, frame, WINDOW } from './harness'

/** Mounts every contender on dataset `a` and closes each over an a/b swap. */
function refresh(a: Shipment[], b: Shipment[]) {
	return prepareGrids(a, (grid, box) => {
		let flip = false

		return async () => {
			flip = !flip

			const next = flip ? b : a

			grid.update(next)

			await painted(box, [next[0]?.reference ?? '', next[8]?.reference ?? ''])

			// Yield one real frame per refresh, the way a polling dashboard paints
			// between updates. A synchronous contender (the ui module's `flushSync`
			// commit, MUI's render) otherwise settles in zero frames, so many
			// iterations chain in one tick with no yield — React counts those as
			// nested updates and trips its depth guard on the ui grid's benign
			// post-commit re-render. The frame is near-free with the frame-rate
			// limit off (see the bench config) and lands on every contender alike.
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
