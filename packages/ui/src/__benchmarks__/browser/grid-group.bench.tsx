/**
 * Client grouping on a live grid: the ui grid groups the rows by carrier,
 * with every group open. AG Grid holds its row grouping in the Enterprise
 * tier, and MUI X holds its row grouping in the Premium tier, so the ui grid
 * runs these scenarios alone. They measure it against its own earlier builds,
 * not against a rival.
 *
 * Three scenarios run:
 *
 * - A mount, which settles when the first rows paint.
 * - An asc/desc sort flip on `id`, which sorts the rows of each group.
 * - A quick filter applied and cleared, which changes the rows of each group.
 */

import { bench, describe } from 'vitest'
import { type Shipment, shipments } from '../fixtures'
import { GRID_HEIGHT, GRID_WIDTH, gridContenders, painted, supports } from './grid-contenders'
import { prepareGrids } from './grid-harness'
import { benches, host, WINDOW } from './harness'

const GROUPED = { grouped: true }

/** The first row of the first group, in the order of the data and in reverse. */
function firstOfGroup(rows: Shipment[]): { asc: string; desc: string } {
	const carrier = rows[0]?.carrier

	const members = rows.filter((row) => row.carrier === carrier)

	return { asc: members[0]?.id ?? '', desc: members.at(-1)?.id ?? '' }
}

/**
 * Registers one mount, paint, and unmount bench for each contender that
 * groups. It settles on the first row of the first group, since the rows of
 * the data fall in many groups.
 */
function mountBenches(rows: Shipment[]) {
	const marker = firstOfGroup(rows).asc

	const box = host({ width: GRID_WIDTH, height: GRID_HEIGHT })

	for (const contender of gridContenders()) {
		if (!supports(contender, GROUPED)) continue

		bench(
			contender.name,
			async () => {
				const grid = contender.mount(box, rows, GROUPED)

				await painted(box, [marker])

				grid.destroy()
			},
			WINDOW.slow,
		)
	}
}

/** Mounts the grid and closes it over an asc/desc sort flip. */
function sortFlip(rows: Shipment[]) {
	const first = firstOfGroup(rows)

	return prepareGrids(
		rows,
		(grid, box) => {
			let descending = false

			return async () => {
				descending = !descending

				grid.sort(descending ? 'desc' : 'asc')

				await painted(box, [descending ? first.desc : first.asc])
			}
		},
		GROUPED,
	)
}

/**
 * Mounts the grid and closes it over a quick filter that it applies and
 * clears. The clear settles on the row count that the toolbar shows. A grouped
 * window that grows back keeps its scroll offset, so the first row of the
 * first group can sit out of view.
 */
function filterCycle(rows: Shipment[]) {
	const count = `${rows.length} rows`

	const survivor = rows.find((row) => row.carrier === 'Globex')?.id

	if (!survivor) throw new Error('grid group bench found no row carried by Globex')

	return prepareGrids(
		rows,
		(grid, box) => async () => {
			grid.search('Globex')

			await painted(box, [survivor])

			grid.search('')

			await painted(box, [count])
		},
		GROUPED,
	)
}

const rows10k = shipments(10_000)

const rows100k = shipments(100_000)

const sort100k = await sortFlip(rows100k)

const filter100k = await filterCycle(rows100k)

describe('grid group · 10,000 rows · mount', () => {
	mountBenches(rows10k)
})

describe('grid group · 100,000 rows · mount', () => {
	mountBenches(rows100k)
})

describe('grid group · 100,000 rows · sort flip', () => {
	benches(sort100k, WINDOW.slow)
})

describe('grid group · 100,000 rows · quick filter + clear', () => {
	benches(filter100k, WINDOW.slow)
})
