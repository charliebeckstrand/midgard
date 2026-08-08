/**
 * Truncation cost on a resize, in the worst case for it: a non-virtualized grid
 * of hundreds-to-thousands of rows whose column shrinks so every cell in it
 * truncates at once. The concern is that a mass truncation charges a per-cell
 * layout read or tooltip mount — so this measures the resize-settle cost with
 * `truncate` on against `truncate={false}`, and their difference is the whole
 * truncation overhead for the cells the pointer never visited.
 *
 * The grid is deliberately un-windowed (no `virtualize`/`maxHeight`), so all N
 * rows mount and the resized column re-renders every one of its cells. No cell
 * is hovered, matching the case that matters: thousands of cells the user has
 * not touched, re-flowing under a drag. Each iteration toggles the `origin`
 * column between a width that truncates its city names and one that fits them,
 * then yields frames so the truncation hook's deferred re-measure backstop lands
 * inside the timed region.
 */

import { createRoot } from 'react-dom/client'
import { describe } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { SHIPMENT_FIELDS, type Shipment, shipmentKey, shipments } from '../fixtures'
import { painted } from './grid-contenders'
import { benches, host, type Prepared, settle, WINDOW } from './harness'

// Explicit `cell` renderers so content paints synchronously (a bare column's
// default content resolver defers to a layout pass that a headless mount races);
// the truncating span still wraps this output, so the resize truncation is real.
const COLUMNS: GridColumn<Shipment>[] = SHIPMENT_FIELDS.map(([id, title]) => ({
	id,
	title,
	cell: (row) => String(row[id]),
}))

/** The narrow width truncates the origin city names; the wide one fits them. */
const NARROW = 48

const WIDE = 320

/**
 * Mounts one non-virtualized grid per `truncate` setting and closes each over a
 * narrow/wide resize toggle, awaiting the first paint before the bench registers
 * (the browser harness races a synchronous mount during collection otherwise).
 */
async function prepare(rows: Shipment[]): Promise<Prepared[]> {
	const prepared: Prepared[] = []

	for (const truncate of [true, false]) {
		const box = host({ width: 640 })

		const root = createRoot(box)

		let wide = false

		const draw = () =>
			root.render(
				<Grid
					columns={COLUMNS}
					rows={rows}
					getKey={shipmentKey}
					resizable
					truncate={truncate}
					columnSizing={{ value: { origin: wide ? WIDE : NARROW } }}
				/>,
			)

		draw()

		await painted(box, [rows[0]?.id ?? ''])

		prepared.push({
			name: truncate ? 'truncate' : 'truncate={false}',
			run: async () => {
				wide = !wide

				draw()

				// Three frames: React commits, the browser reflows, then the
				// truncation hook's deferred re-measure backstop lands.
				await settle(3)
			},
		})
	}

	return prepared
}

const rows1k = await prepare(shipments(1_000))

const rows3k = await prepare(shipments(3_000))

describe('grid resize · 1,000 rows · un-windowed · mass truncation', () => {
	benches(rows1k, WINDOW.slow)
})

describe('grid resize · 3,000 rows · un-windowed · mass truncation', () => {
	benches(rows3k, WINDOW.slow)
})
