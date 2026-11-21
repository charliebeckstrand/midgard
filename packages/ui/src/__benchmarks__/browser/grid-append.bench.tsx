/**
 * The cost of an infinite-scroll append on a grid that the autosizer sizes.
 * Each sample scrolls the window to the end of the loaded rows, appends one
 * batch, and waits one frame. That is the moment that `onLoadMore` fires in
 * an app. The columns declare no width, so the browser sizes them.
 *
 * The `hold` grid keeps the default `stableColumnWidths`, so an append
 * measures nothing. The `widen` grid sets it to `false`, so each append runs
 * the width pass over the window. The difference of the two rows is the cost
 * of that pass (Grid roadmap, avenue 5).
 */

import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { Grid } from '../../modules/grid'
import type { GridColumn } from '../../modules/grid/types'
import { compareBenches } from '../compare'
import { SHIPMENT_FIELDS, type Shipment, shipmentKey, shipments } from '../fixtures'
import { GRID_HEIGHT, GRID_WIDTH } from './grids'
import { benches, frame, host, type Prepared, WINDOW } from './harness'

/** The rows that the grid loads before the first sample. */
const LOADED = 10_000

/** The rows that one append adds. */
const BATCH = 50

/** The appends that the fixture holds rows for. A longer run starts again from {@link LOADED}. */
const APPENDS = 1_000

const COLUMNS: GridColumn<Shipment>[] = SHIPMENT_FIELDS.map(([id, title]) => ({
	id,
	title,
	value: (row) => row[id],
	cell: (row) => String(row[id]),
}))

/** One variant: its report name, and the `stableColumnWidths` that it sets. */
type Variant = { name: string; stable: boolean | undefined }

const VARIANTS: Variant[] = [
	{ name: 'hold (default)', stable: undefined },
	{ name: 'widen (stableColumnWidths: false)', stable: false },
]

/** The rows of every append, so a sample builds no fixture. */
const pool = shipments(LOADED + BATCH * APPENDS)

/** Mounts one grid for each variant, and closes each over one append at the end of the rows. */
async function appends(): Promise<Prepared[]> {
	const prepared: Prepared[] = []

	for (const { name, stable } of VARIANTS) {
		const box = host({ width: GRID_WIDTH, height: GRID_HEIGHT })

		const root = createRoot(box)

		let count = LOADED

		const draw = () =>
			flushSync(() =>
				root.render(
					<Grid
						columns={COLUMNS}
						rows={pool.slice(0, count)}
						getKey={shipmentKey}
						virtualize
						maxHeight={`${GRID_HEIGHT}px`}
						infiniteScroll={{ onLoadMore: () => {}, stableColumnWidths: stable }}
					/>,
				),
			)

		draw()

		await frame()

		await frame()

		const scroller = box.querySelector<HTMLElement>('[data-slot="grid-scroll"]')

		if (!scroller) throw new Error('grid append bench found no scroller')

		prepared.push({
			name,
			run: async () => {
				scroller.scrollTop = scroller.scrollHeight

				await frame()

				count = count + BATCH > pool.length ? LOADED : count + BATCH

				draw()

				await frame()
			},
		})
	}

	return prepared
}

const appended = await appends()

compareBenches(
	`grid append · ${LOADED.toLocaleString('en-US')} rows · ${BATCH} rows each`,
	(bench) => {
		benches(bench, appended)
	},
	WINDOW.slow,
)
