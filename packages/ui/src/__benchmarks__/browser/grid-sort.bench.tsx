/**
 * Whole-column sort cost on a live grid: each iteration flips an `id` sort
 * between ascending and descending through the controlled `sort` binding of
 * the ui grid, so the grid re-sorts the full dataset and repaints the window.
 * The ids are zero-padded, so the ascending order is the order of the
 * fixture. The iteration settles when the expected extreme rows paint at the
 * top. A grid with the keyboard cursor also follows the cursor through each
 * sort, so one row measures that cost too.
 */

import { compareBenches } from '../compare'
import { type Shipment, shipments } from '../fixtures'
import { prepareGrids, viewportMarkers } from './grid-harness'
import { type MountOptions, painted } from './grids'
import { benches, WINDOW } from './harness'

/** Mounts the grid and closes it over an asc/desc sort flip. */
function sortFlip(rows: Shipment[], options?: MountOptions) {
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
		options,
	)
}

const rows10k = await sortFlip(shipments(10_000))

const rows100k = await sortFlip(shipments(100_000))

const navigable100k = await sortFlip(shipments(100_000), { navigable: true })

compareBenches(
	'grid sort · 10,000 rows · asc/desc flip',
	(bench) => {
		benches(bench, rows10k)
	},
	WINDOW.slow,
)

compareBenches(
	'grid sort · 100,000 rows · asc/desc flip',
	(bench) => {
		benches(bench, rows100k)
	},
	WINDOW.slow,
)

compareBenches(
	'grid sort · 100,000 rows · navigable · asc/desc flip',
	(bench) => {
		benches(bench, navigable100k)
	},
	WINDOW.slow,
)
