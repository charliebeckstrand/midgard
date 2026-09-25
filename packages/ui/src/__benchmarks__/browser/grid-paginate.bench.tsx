/**
 * Client pagination on a live grid, with {@link PAGE_SIZE} rows on each page.
 * Each library pages its full dataset through its own pagination: the ui
 * module's `pagination` binding, AG's `pagination` option, and MUI's
 * `paginationModel`. Three scenarios run:
 *
 * - A mount, which settles when the first rows of the first page paint.
 * - A page flip, which shows the second page and then the first page again.
 * - An asc/desc sort flip on `id`, which settles when the first rows of the
 *   sorted first page paint.
 */

import { describe } from 'vitest'
import { type Shipment, shipments } from '../fixtures'
import { PAGE_SIZE, painted } from './grid-contenders'
import { mountGridBenches, prepareGrids, viewportMarkers } from './grid-harness'
import { benches, WINDOW } from './harness'

const PAGINATED = { paginated: true }

/** Mounts every paginated contender and closes each over a flip to the second page and back. */
function pageFlip(rows: Shipment[]) {
	const first = viewportMarkers(rows)

	const second = [rows[PAGE_SIZE]?.id ?? '', rows[PAGE_SIZE + 8]?.id ?? '']

	return prepareGrids(
		rows,
		(grid, box) => async () => {
			grid.page(1)

			await painted(box, second)

			grid.page(0)

			await painted(box, first)
		},
		PAGINATED,
	)
}

/** Mounts every paginated contender and closes each over an asc/desc sort flip. */
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
		PAGINATED,
	)
}

const rows10k = shipments(10_000)

const rows100k = shipments(100_000)

const flip10k = await pageFlip(rows10k)

const flip100k = await pageFlip(rows100k)

const sort10k = await sortFlip(rows10k)

const sort100k = await sortFlip(rows100k)

describe('grid paginate · 10,000 rows · mount', () => {
	mountGridBenches(rows10k, WINDOW.slow, PAGINATED)
})

describe('grid paginate · 100,000 rows · mount', () => {
	mountGridBenches(rows100k, WINDOW.slow, PAGINATED)
})

describe('grid paginate · 10,000 rows · page flip', () => {
	benches(flip10k, WINDOW.slow)
})

describe('grid paginate · 100,000 rows · page flip', () => {
	benches(flip100k, WINDOW.slow)
})

describe('grid paginate · 10,000 rows · sort flip', () => {
	benches(sort10k, WINDOW.slow)
})

describe('grid paginate · 100,000 rows · sort flip', () => {
	benches(sort100k, WINDOW.slow)
})
