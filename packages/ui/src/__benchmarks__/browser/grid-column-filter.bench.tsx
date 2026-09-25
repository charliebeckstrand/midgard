/**
 * Column-filter cost on a live grid. Each iteration applies a `contains`
 * filter to the carrier column through the library's own column filter (the
 * ui module's `columnFilters` binding, AG's filter model, MUI's
 * `filterModel.items`). It settles until the surviving rows paint. Then it
 * clears the filter and settles until the full set is back. A sample
 * therefore covers the narrowing and the widening of one filter edit.
 *
 * Each contender mounts with a filterable carrier column. The terms come from
 * the carrier names of the fixture, so each term keeps a known share of the
 * rows.
 */

import { describe } from 'vitest'
import { type Shipment, shipments } from '../fixtures'
import { painted } from './grid-contenders'
import { prepareGrids, viewportMarkers } from './grid-harness'
import { benches, WINDOW } from './harness'

/** Carriers the fixture assigns, cycled so no iteration repeats the last term. */
const TERMS = ['Globex', 'Initech', 'Umbrella'] as const

/** Mounts every contender and closes each over an apply-then-clear filter cycle. */
function filterCycle(rows: Shipment[]) {
	const full = viewportMarkers(rows)

	// The first row that each term keeps, so the probe waits on a real survivor.
	// A term that the fixture never assigned stops the bench here.
	const survivors = TERMS.map((term) => {
		const survivor = rows.find((row) => row.carrier === term)

		if (!survivor) throw new Error(`grid column filter bench found no row carried by ${term}`)

		return survivor.id
	})

	return prepareGrids(
		rows,
		(grid, box) => {
			let step = 0

			return async () => {
				const index = step++ % TERMS.length

				grid.filter(TERMS[index] as string)

				await painted(box, [survivors[index] as string])

				grid.filter('')

				await painted(box, full)
			}
		},
		{ filterable: true },
	)
}

const rows10k = await filterCycle(shipments(10_000))

const rows100k = await filterCycle(shipments(100_000))

describe('grid column filter · 10,000 rows · carrier filter + clear', () => {
	benches(rows10k, WINDOW.slow)
})

describe('grid column filter · 100,000 rows · carrier filter + clear', () => {
	benches(rows100k, WINDOW.slow)
})
