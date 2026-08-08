/**
 * Quick-filter cost on a live grid — the search-as-you-type path, and the one
 * grid operation that re-derives the whole row model from scratch. Each
 * iteration applies a term through the library's own quick filter (the ui
 * module's `search` binding, AG's `quickFilterText`, MUI's
 * `filterModel.quickFilterValues`), settles until the surviving rows paint,
 * then clears it and settles until the full set is back — so a sample covers
 * both the narrowing and the widening a keystroke and a backspace produce.
 *
 * All three scan the same eight columns: the ui grid searches the columns
 * declaring a `value` accessor and every bench column declares one, while AG
 * and MUI scan their bound fields by default.
 *
 * The terms are drawn from the fixture's own carrier names, so each one
 * survives on a predictable share of the rows — a term matching nothing would
 * measure an empty render rather than a filter.
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

	// The first row each term leaves, so the probe waits on a real survivor
	// rather than on the term appearing in the search box. A term the fixture
	// never assigned would settle on an empty grid and measure nothing, so it
	// fails here instead.
	const survivors = TERMS.map((term) => {
		const survivor = rows.find((row) => row.carrier === term)

		if (!survivor) throw new Error(`grid filter bench found no row carried by ${term}`)

		return survivor.id
	})

	return prepareGrids(rows, (grid, box) => {
		let step = 0

		return async () => {
			const index = step++ % TERMS.length

			grid.search(TERMS[index] as string)

			await painted(box, [survivors[index] as string])

			grid.search('')

			await painted(box, full)
		}
	})
}

const rows10k = await filterCycle(shipments(10_000))

const rows100k = await filterCycle(shipments(100_000))

describe('grid filter · 10,000 rows · quick filter + clear', () => {
	benches(rows10k, WINDOW.slow)
})

describe('grid filter · 100,000 rows · quick filter + clear', () => {
	benches(rows100k, WINDOW.slow)
})
