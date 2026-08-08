/**
 * Whole-column sort cost on a live grid: each iteration flips an `id` sort
 * between ascending and descending through the library's own sort state —
 * the ui module and MUI X take a controlled sort model, AG its column-state
 * API — so the engine re-sorts the full dataset and repaints the window.
 * The zero-padded ids sort identically as strings everywhere, and the
 * iteration settles when the expected extreme rows paint at the top.
 */

import { describe } from 'vitest'
import { type Shipment, shipments } from '../fixtures'
import { painted } from './grid-contenders'
import { prepareGrids, viewportMarkers } from './grid-harness'
import { benches, WINDOW } from './harness'

/** Mounts every contender and closes each over an asc/desc sort flip. */
function sortFlip(rows: Shipment[]) {
	const first = viewportMarkers(rows)

	const last = [rows[rows.length - 1]?.id ?? '', rows[rows.length - 9]?.id ?? '']

	return prepareGrids(rows, (grid, box) => {
		let descending = false

		return async () => {
			descending = !descending

			grid.sort(descending ? 'desc' : 'asc')

			await painted(box, descending ? last : first)
		}
	})
}

const rows10k = await sortFlip(shipments(10_000))

const rows100k = await sortFlip(shipments(100_000))

describe('grid sort · 10,000 rows · asc/desc flip', () => {
	benches(rows10k, WINDOW.slow)
})

describe('grid sort · 100,000 rows · asc/desc flip', () => {
	benches(rows100k, WINDOW.slow)
})
