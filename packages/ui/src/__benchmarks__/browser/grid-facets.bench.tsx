/**
 * The first open of a column filter that lists the values of the column: a
 * `select` filter on the carrier column. The sheet offers the carriers of the
 * rows that pass the other filters, so its open collects them. Each iteration
 * mounts the grid, opens the filter, settles when the sheet paints, and
 * unmounts. A reopen on the same data reads a cached list, so the scenario
 * times the first open.
 *
 * AG Grid holds its set filter in the Enterprise tier, and the filter of
 * MUI X lists no values, so the ui grid runs alone. The scenario measures it
 * against its own earlier builds, not against a rival.
 */

import { bench, describe } from 'vitest'
import { type Shipment, shipments } from '../fixtures'
import { GRID_HEIGHT, GRID_WIDTH, gridContenders, painted, supports } from './grid-contenders'
import { viewportMarkers } from './grid-harness'
import { host, WINDOW } from './harness'

const FACETS = { facets: true }

/** Resolves when the filter sheet is in the document, looking once for each animation frame. */
async function sheetPainted(): Promise<void> {
	for (let frame = 0; frame < 600; frame++) {
		if (document.querySelector('form[data-slot="grid-filter"]')) return

		await new Promise(requestAnimationFrame)
	}

	throw new Error('grid facets bench never painted the filter sheet')
}

/** Registers one mount, open, and unmount bench for each contender that lists values. */
function openBenches(rows: Shipment[]) {
	const markers = viewportMarkers(rows)

	const box = host({ width: GRID_WIDTH, height: GRID_HEIGHT })

	for (const contender of gridContenders()) {
		if (!supports(contender, FACETS)) continue

		bench(
			contender.name,
			async () => {
				const grid = contender.mount(box, rows, FACETS)

				await painted(box, markers)

				grid.openFacets?.()

				await sheetPainted()

				grid.destroy()
			},
			WINDOW.slow,
		)
	}
}

describe('grid facets · 10,000 rows · mount + first filter open', () => {
	openBenches(shipments(10_000))
})

describe('grid facets · 100,000 rows · mount + first filter open', () => {
	openBenches(shipments(100_000))
})
