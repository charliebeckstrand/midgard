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

import { createRoot, type Root } from 'react-dom/client'
import { bench, describe } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { makeShipments, type Shipment } from '../fixtures'
import { painted } from './grid-contenders'

// Explicit `cell` renderers so content paints synchronously (a bare column's
// default content resolver defers to a layout pass that a headless mount races);
// the truncating span still wraps this output, so the resize truncation is real.
const COLUMNS: GridColumn<Shipment>[] = [
	{ id: 'id', title: 'ID', cell: (r) => r.id },
	{ id: 'reference', title: 'Reference', cell: (r) => r.reference },
	{ id: 'origin', title: 'Origin', cell: (r) => r.origin },
	{ id: 'destination', title: 'Destination', cell: (r) => r.destination },
	{ id: 'status', title: 'Status', cell: (r) => r.status },
	{ id: 'carrier', title: 'Carrier', cell: (r) => r.carrier },
	{ id: 'loads', title: 'Loads', cell: (r) => String(r.loads) },
	{ id: 'weight', title: 'Weight', cell: (r) => String(r.weight) },
]

const getKey = (row: Shipment) => row.id

/** The narrow width truncates the origin city names; the wide one fits them. */
const NARROW = 48

const WIDE = 320

/** Slow, layout-heavy iterations; a longer window keeps the sample count up. */
const SLOW = { time: 2_000 }

type PreparedBench = { name: string; run: () => Promise<void> }

/** Settles the resize: React commits, the browser reflows, the rAF backstop measures. */
async function settle(): Promise<void> {
	await new Promise(requestAnimationFrame)

	await new Promise(requestAnimationFrame)

	await new Promise(requestAnimationFrame)
}

/**
 * Mounts one non-virtualized grid per `truncate` setting and closes each over a
 * narrow/wide resize toggle, awaiting the first paint before the bench registers
 * (the browser harness races a synchronous mount during collection otherwise).
 */
async function prepare(rows: Shipment[]): Promise<PreparedBench[]> {
	const prepared: PreparedBench[] = []

	for (const truncate of [true, false]) {
		const host = document.createElement('div')

		host.style.width = '640px'

		document.body.append(host)

		const root: Root = createRoot(host)

		let wide = false

		const draw = () =>
			root.render(
				<Grid
					columns={COLUMNS}
					rows={rows}
					getKey={getKey}
					resizable
					truncate={truncate}
					columnSizing={{ value: { origin: wide ? WIDE : NARROW } }}
				/>,
			)

		draw()

		await painted(host, [rows[0]?.id ?? ''])

		prepared.push({
			name: truncate ? 'truncate' : 'truncate={false}',
			run: async () => {
				wide = !wide

				draw()

				await settle()
			},
		})
	}

	return prepared
}

const rows1k = await prepare(makeShipments(1_000))

const rows3k = await prepare(makeShipments(3_000))

describe('grid resize · 1,000 rows · un-windowed · mass truncation', () => {
	for (const { name, run } of rows1k) bench(name, run, SLOW)
})

describe('grid resize · 3,000 rows · un-windowed · mass truncation', () => {
	for (const { name, run } of rows3k) bench(name, run, SLOW)
})
