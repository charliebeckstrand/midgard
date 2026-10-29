/**
 * The first open of a column filter that lists the values of the column: a
 * `select` filter on the carrier column. The sheet offers the carriers of the
 * rows that pass the other filters, so its open collects them. Each iteration
 * mounts the grid, opens the filter, settles when the sheet paints, and
 * unmounts. A reopen on the same data reads a cached list, so the scenario
 * times the first open.
 */

import type { Bench } from 'vitest'
import { compareBenches } from '../compare'
import { type Shipment, shipments } from '../fixtures'
import { viewportMarkers } from './grid-harness'
import { GRID_HEIGHT, GRID_WIDTH, grids, painted } from './grids'
import { host, WINDOW } from './harness'

const FACETS = { facets: true }

/** Resolves when the filter sheet is in the document, looking once for each animation frame. */
async function sheetPainted(): Promise<void> {
	for (let frame = 0; frame < 600; frame++) {
		if (document.querySelector('[data-slot="sheet"]')) return

		await new Promise(requestAnimationFrame)
	}

	throw new Error('grid facets bench never painted the filter sheet')
}

/** Registers one mount, open, and unmount bench for each grid. */
function openBenches(bench: Bench, rows: Shipment[]) {
	const markers = viewportMarkers(rows)

	const box = host({ width: GRID_WIDTH, height: GRID_HEIGHT })

	for (const subject of grids()) {
		bench(subject.name, async () => {
			const grid = subject.mount(box, rows, FACETS)

			await painted(box, markers)

			grid.openFacets()

			await sheetPainted()

			grid.destroy()
		})
	}
}

compareBenches(
	'grid facets · 10,000 rows · mount + first filter open',
	(bench) => openBenches(bench, shipments(10_000)),
	WINDOW.slow,
)

compareBenches(
	'grid facets · 100,000 rows · mount + first filter open',
	(bench) => openBenches(bench, shipments(100_000)),
	WINDOW.slow,
)
