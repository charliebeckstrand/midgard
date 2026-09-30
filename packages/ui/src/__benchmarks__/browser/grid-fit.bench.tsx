/**
 * The cost of the column fit on a grid that the autosizer sizes: a mount, and a
 * sort. The other grid scenarios declare fixed widths and a window of rows. This
 * one declares no width and renders all 1,000 rows, as the admin users grid does,
 * so each fit measures every body cell. The status column renders a `Badge`, so
 * the fit also reads element-bearing cells.
 *
 * Each sample ends one rendered frame after the paint probe, so the style and
 * layout work that the commit leaves to the browser is inside the sample. A
 * frame costs about 17 ms in the headless container (README), so a row reads
 * that much above the work.
 *
 * The `navigable` rows mount the keyboard cell cursor, which adds its own node
 * to each cell.
 */

import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { describe } from 'vitest'
import { Badge } from '../../components/badge'
import { Grid, type GridColumn, type GridSortState } from '../../modules/grid'
import { SHIPMENT_FIELDS, type Shipment, shipmentKey, shipments } from '../fixtures'
import { GRID_HEIGHT, GRID_WIDTH, painted } from './grids'
import { benches, frame, host, type Prepared, WINDOW } from './harness'

const COLUMNS: GridColumn<Shipment>[] = SHIPMENT_FIELDS.map(([id, title]) => ({
	id,
	title,
	sortable: true,
	value: (row) => row[id],
	cell: id === 'status' ? (row) => <Badge>{row.status}</Badge> : (row) => String(row[id]),
}))

/** One variant: its report name, and whether the grid mounts the cell cursor. */
type Variant = { name: string; navigable: boolean }

const VARIANTS: Variant[] = [
	{ name: 'autosized', navigable: false },
	{ name: 'autosized · navigable', navigable: true },
]

/** Resolves once the first body row of `box` shows `id`, waiting one frame between looks. */
async function leads(box: HTMLElement, id: string): Promise<void> {
	for (let look = 0; look < 600; look++) {
		if (box.querySelector('tbody tr td')?.textContent === id) return

		await frame()
	}

	throw new Error(`grid bench never led with ${id}`)
}

/** Resolves after the next rendered frame: the style, layout, and paint of that frame are done. */
async function rendered(): Promise<void> {
	await frame()

	await new Promise<void>((resolve) => {
		const channel = new MessageChannel()

		channel.port1.onmessage = () => resolve()

		channel.port2.postMessage(null)
	})
}

/** Mounts one grid into `box`, and returns a sort and a teardown. */
function mountGrid(box: HTMLElement, rows: Shipment[], navigable: boolean) {
	const root = createRoot(box)

	let sort: GridSortState[] = []

	const draw = () =>
		flushSync(() =>
			root.render(
				<Grid
					columns={COLUMNS}
					rows={rows}
					getKey={shipmentKey}
					navigable={navigable}
					sort={{ value: sort }}
				/>,
			),
		)

	draw()

	return {
		sort(direction: 'asc' | 'desc') {
			sort = [{ column: 'id', direction }]

			draw()
		},
		destroy: () => root.unmount(),
	}
}

/** One mount to the first rendered frame, then a teardown, for each variant. */
function mounts(rows: Shipment[]): Prepared[] {
	const box = host({ width: GRID_WIDTH, height: GRID_HEIGHT })

	const markers = [rows[0]?.id ?? '', rows[8]?.id ?? '']

	return VARIANTS.map(({ name, navigable }) => ({
		name,
		run: async () => {
			const grid = mountGrid(box, rows, navigable)

			await painted(box, markers)

			await rendered()

			grid.destroy()
		},
	}))
}

/**
 * Mounts one grid for each variant, and closes each over an asc/desc flip of the
 * `id` sort. The ids are zero-padded, so the ascending order is the order of the
 * fixture. The flip settles when the first row of the new order paints.
 */
async function sorts(rows: Shipment[]): Promise<Prepared[]> {
	const prepared: Prepared[] = []

	const first = rows[0]?.id ?? ''

	const last = rows.at(-1)?.id ?? ''

	for (const { name, navigable } of VARIANTS) {
		const box = host({ width: GRID_WIDTH, height: GRID_HEIGHT })

		const grid = mountGrid(box, rows, navigable)

		await leads(box, first)

		await rendered()

		let descending = false

		prepared.push({
			name,
			run: async () => {
				descending = !descending

				grid.sort(descending ? 'desc' : 'asc')

				await leads(box, descending ? last : first)

				await rendered()
			},
		})
	}

	return prepared
}

const rows = shipments(1_000)

const sorted = await sorts(rows)

describe('grid fit · mount · 1,000 rows', () => {
	benches(mounts(rows), WINDOW.slow)
})

describe('grid fit · sort · 1,000 rows · asc/desc flip', () => {
	benches(sorted, WINDOW.slow)
})
