/**
 * What a render of a parent costs a live grid, by the identity of the
 * `columns` that it hands down.
 *
 * An index of records often builds its columns from the actions of each row,
 * such as an open or a delete. When those actions change identity, the parent
 * builds new column objects, with new `cell` and `value` functions, for columns
 * that show the same thing. The grid then cannot tell them from a real change of
 * columns.
 *
 * Each row mounts the grid once over 500 rows, the size of a large index of
 * places, and renders it again through its root, under `flushSync`. Read the
 * gaps: `same array` is the floor, the step to `new array, same columns` is what
 * a new array alone costs, and the step to `new column objects` is what new
 * column objects cost.
 */

import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { Grid } from '../../modules/grid'
import type { GridColumn } from '../../modules/grid/types'
import { compareBenches } from '../compare'
import { SHIPMENT_FIELDS, type Shipment, shipmentKey, shipments } from '../fixtures'
import { GRID_HEIGHT, GRID_WIDTH, painted } from './grids'
import { benches, host, type Prepared, WINDOW } from './harness'

/** The rows of the grid: a large index of places. */
const ROWS = shipments(500, 1)

/** New column objects, with new `cell` and `value` functions, on each call. */
function makeColumns(): GridColumn<Shipment>[] {
	return SHIPMENT_FIELDS.map(([id, title]) => ({
		id,
		title,
		sortable: true,
		width: '120px',
		cell: (row) => row[id],
		value: (row) => row[id],
	}))
}

const COLUMNS = makeColumns()

/** How each row builds the `columns` of the next render. */
const VARIANTS: [string, () => GridColumn<Shipment>[]][] = [
	['same array (the floor)', () => COLUMNS],
	['new array, same columns', () => [...COLUMNS]],
	['new column objects', makeColumns],
]

/** Mounts one grid and returns the render that a bench drives it through. */
async function mountGrid(columns: () => GridColumn<Shipment>[]): Promise<() => void> {
	const box = host({ width: GRID_WIDTH, height: GRID_HEIGHT })

	const root = createRoot(box)

	// The element is built for each call. React bails out of a render that gets
	// the element that it already holds, so a held element would measure nothing.
	const draw = () =>
		flushSync(() =>
			root.render(
				<Grid
					columns={columns()}
					rows={ROWS}
					getKey={shipmentKey}
					virtualize
					maxHeight={`${GRID_HEIGHT}px`}
					search={{ placeholder: 'Search' }}
					hover
				/>,
			),
		)

	draw()

	await painted(box, [ROWS[0]?.reference ?? ''])

	return draw
}

const prepared: Prepared[] = []

for (const [name, columns] of VARIANTS) {
	prepared.push({ name, run: await mountGrid(columns) })
}

compareBenches(
	`grid · parent render · ${ROWS.length} rows × ${SHIPMENT_FIELDS.length} cols`,
	(bench) => {
		benches(bench, prepared)
	},
	WINDOW.slow,
)
