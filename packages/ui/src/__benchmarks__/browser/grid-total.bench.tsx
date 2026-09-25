/**
 * A grand total on a live grid: the ui grid sums the loads and the weight of
 * every row that its filters keep, in a total row. AG Grid holds its
 * grand-total row in the Enterprise tier, and MUI X holds its aggregation in
 * the Premium tier, so the ui grid runs these scenarios alone. They measure
 * the ui grid against its own earlier builds, not against a rival.
 *
 * Three scenarios run:
 *
 * - A mount, which settles when the first rows paint.
 * - An asc/desc sort flip on `id`. The rows of the total stay the same.
 * - A quick filter applied and cleared. The rows of the total change.
 */

import { describe } from 'vitest'
import { type Shipment, shipments } from '../fixtures'
import { painted } from './grid-contenders'
import { mountGridBenches, prepareGrids, viewportMarkers } from './grid-harness'
import { benches, WINDOW } from './harness'

const TOTALED = { grandTotal: true }

/** Mounts the grid and closes it over an asc/desc sort flip. */
function sortFlip(rows: Shipment[]) {
	const first = viewportMarkers(rows)

	const last = [rows[rows.length - 1]?.id ?? '', rows[rows.length - 9]?.id ?? '']

	return prepareGrids(
		rows,
		(grid, box) => {
			let descending = false

			return async () => {
				descending = !descending

				grid.sort(descending ? 'desc' : 'asc')

				await painted(box, descending ? last : first)
			}
		},
		TOTALED,
	)
}

/** Mounts the grid and closes it over a quick filter that it applies and clears. */
function filterCycle(rows: Shipment[]) {
	const full = viewportMarkers(rows)

	const survivor = rows.find((row) => row.carrier === 'Globex')?.id

	if (!survivor) throw new Error('grid total bench found no row carried by Globex')

	return prepareGrids(
		rows,
		(grid, box) => async () => {
			grid.search('Globex')

			await painted(box, [survivor])

			grid.search('')

			await painted(box, full)
		},
		TOTALED,
	)
}

const rows10k = shipments(10_000)

const rows100k = shipments(100_000)

const sort100k = await sortFlip(rows100k)

const filter100k = await filterCycle(rows100k)

describe('grid total · 10,000 rows · mount', () => {
	mountGridBenches(rows10k, WINDOW.slow, TOTALED)
})

describe('grid total · 100,000 rows · mount', () => {
	mountGridBenches(rows100k, WINDOW.slow, TOTALED)
})

describe('grid total · 100,000 rows · sort flip', () => {
	benches(sort100k, WINDOW.slow)
})

describe('grid total · 100,000 rows · quick filter + clear', () => {
	benches(filter100k, WINDOW.slow)
})
