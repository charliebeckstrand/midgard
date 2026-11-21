/**
 * Truncation cost on a resize, in the worst case for it: a non-virtualized grid
 * of hundreds-to-thousands of rows whose column shrinks so every cell in it
 * truncates at once. The concern is that a mass truncation charges a per-cell
 * layout read or tooltip mount, so this measures the resize-settle cost with
 * `truncate` on against `truncate={false}`, and their difference is the whole
 * truncation overhead for the cells the pointer never visited.
 *
 * The grid is deliberately un-windowed (no `virtualize`/`maxHeight`), so all N
 * rows mount and each cell of the resized column lays out again. The width
 * moves through the `<colgroup>` alone, so no row renders again (see
 * `GridSettleStore`). No cell is hovered, which is the case that matters:
 * thousands of cells that the user has not touched reflow under a resize. Only
 * a visited cell subscribes to the settle re-measure, so no cell here measures
 * again. Each iteration toggles the `origin` column between a width that
 * truncates its city names and a width that fits them. It then yields frames,
 * so the commit and the reflow land inside the timed region.
 *
 * A third subject freezes `origin` and the column after it. The toggle then
 * moves the sticky offset of the second frozen column in each row, so the
 * bench also prices the frozen chrome through a resize.
 */

import { createRoot } from 'react-dom/client'
import { Grid } from '../../modules/grid'
import type { GridColumn } from '../../modules/grid/types'
import { compareBenches } from '../compare'
import { SHIPMENT_FIELDS, type Shipment, shipmentKey, shipments } from '../fixtures'
import { painted } from './grids'
import { benches, host, type Prepared, settle, WINDOW } from './harness'

// Explicit `cell` renderers, because a ui column renders nothing without a
// `cell`. The truncating span wraps this output, so the resize truncation is real.
const COLUMNS: GridColumn<Shipment>[] = SHIPMENT_FIELDS.map(([id, title]) => ({
	id,
	title,
	cell: (row) => String(row[id]),
}))

/** The columns that the frozen subject freezes to the left edge: `origin` and the column after it. */
const FROZEN = new Set<string>(['origin', 'destination'])

/** {@link COLUMNS} with the {@link FROZEN} columns pinned left. */
const FROZEN_COLUMNS: GridColumn<Shipment>[] = COLUMNS.map((column) =>
	FROZEN.has(String(column.id)) ? { ...column, pinned: 'left' } : column,
)

/** The narrow width truncates the origin city names; the wide one fits them. */
const NARROW = 48

const WIDE = 320

/** One subject: its report name, its `truncate` setting, and its columns. */
type Variant = { name: string; truncate: boolean; columns: GridColumn<Shipment>[] }

const VARIANTS: Variant[] = [
	{ name: 'truncate', truncate: true, columns: COLUMNS },
	{ name: 'truncate={false}', truncate: false, columns: COLUMNS },
	{ name: 'truncate · frozen', truncate: true, columns: FROZEN_COLUMNS },
]

/**
 * Mounts one non-virtualized grid per variant and closes each over a
 * narrow/wide resize toggle, awaiting the first paint before the bench registers
 * (the browser harness races a synchronous mount during collection otherwise).
 */
async function prepare(rows: Shipment[]): Promise<Prepared[]> {
	const prepared: Prepared[] = []

	for (const { name, truncate, columns } of VARIANTS) {
		const box = host({ width: 640 })

		const root = createRoot(box)

		let wide = false

		const draw = () =>
			root.render(
				<Grid
					columns={columns}
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
			name,
			run: async () => {
				wide = !wide

				draw()

				// Three frames, so the commit of `root.render` and the reflow land
				// in the sample. No cell is visited, so no settle re-measure runs.
				await settle(3)
			},
		})
	}

	return prepared
}

const rows1k = await prepare(shipments(1_000))

const rows3k = await prepare(shipments(3_000))

compareBenches(
	'grid resize · 1,000 rows · un-windowed · mass truncation',
	(bench) => {
		benches(bench, rows1k)
	},
	WINDOW.slow,
)

compareBenches(
	'grid resize · 3,000 rows · un-windowed · mass truncation',
	(bench) => {
		benches(bench, rows3k)
	},
	WINDOW.slow,
)
