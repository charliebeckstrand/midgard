/**
 * The dashboard grid profile: large row counts, virtualization, and the
 * feature columns a data table wears — the sizes `grid-inline.bench.tsx`
 * deliberately does not cover. Mount scenarios time `render` + `cleanup` per
 * iteration; the toggle scenarios re-render a mounted grid, so a regression
 * there is reconciliation, not mount.
 */

import { describe } from 'vitest'
import { Grid, type GridColumn, type SortState } from '../modules/grid'
import { SHIPMENT_FIELDS, type Shipment, shipmentKey, shipments } from './fixtures'
import { mountBench, mountBenches, rerenderBench } from './harness'

const COLUMNS: GridColumn<Shipment>[] = SHIPMENT_FIELDS.map(([id, title]) => ({
	id,
	title,
	sortable: id === 'origin' || id === 'destination' || id === 'loads',
}))

/** The same set fronted by a selection checkbox column. */
const SELECTABLE: GridColumn<Shipment>[] = [
	{ id: '__select', title: '', selectable: true },
	...COLUMNS,
]

/** Toggles per re-render iteration — enough that per-toggle work outruns the harness. */
const TOGGLES = 5

// Built at collection time: only the render belongs inside the timed region.
const rows1k = shipments(1_000)

const rows10k = shipments(10_000)

describe('Grid · initial render (un-windowed)', () => {
	// Stops at a thousand rows on purpose. An un-windowed grid mounts every row,
	// so the 5,000- and 10,000-row rungs this describe used to carry ran ~2.7s
	// and ~5.2s per iteration — 118 seconds of the suite between them — to
	// measure a configuration nothing ships: past a screenful the module
	// virtualizes, and the virtualized describe below covers exactly those two
	// sizes for 1.5 seconds. What is left here is the range a grid genuinely
	// renders un-windowed.
	mountBenches(
		[
			{ count: 100, rows: shipments(100) },
			{ count: 1_000, rows: rows1k },
		],
		({ count }) => `${count.toLocaleString()} rows × 8 cols`,
		({ rows }) => <Grid columns={COLUMNS} rows={rows} getKey={shipmentKey} />,
	)
})

describe('Grid · with selection column', () => {
	const rows = shipments(1_000)

	mountBenches(
		[
			{ label: '10% pre-selected', keys: rows.filter((_, index) => index % 10 === 0) },
			{ label: 'all selected', keys: rows },
		],
		({ label }) => `1,000 rows · ${label}`,
		({ keys }) => (
			<Grid
				columns={SELECTABLE}
				rows={rows}
				getKey={shipmentKey}
				selection={{ value: new Set(keys.map(shipmentKey)) }}
			/>
		),
	)
})

describe('Grid · column-order logic (visibleColumns memo)', () => {
	// The row-mapping and visibleColumns computation happen on every render.
	// Isolate by rendering a minimal row set but varying column config.
	const manyColumns: GridColumn<Shipment>[] = Array.from({ length: 40 }, (_, index) => ({
		id: `col-${index}`,
		title: `Col ${index}`,
		cell: (row) => row.id,
	}))

	const hidden = new Set<string | number>(manyColumns.slice(0, 20).map((column) => column.id))

	const order = manyColumns.map((column) => column.id).reverse()

	const rows = shipments(100)

	mountBench('40 columns · half hidden · reversed order · 100 rows', () => (
		<Grid
			columns={manyColumns}
			rows={rows}
			getKey={shipmentKey}
			columnOrder={{ value: order }}
			columnManager={{ hidden }}
		/>
	))
})

describe('Grid · virtualized initial render', () => {
	// Where the large row counts live: a windowed grid mounts a screenful
	// whatever the dataset, so these two rungs cover 1k and 10k for a fraction
	// of what the un-windowed mounts above would charge for the same sizes.
	mountBenches(
		[
			{ count: 1_000, rows: rows1k },
			{ count: 10_000, rows: rows10k },
		],
		({ count }) => `${count.toLocaleString()} rows × 8 cols · virtualize`,
		({ rows }) => (
			<Grid columns={COLUMNS} rows={rows} getKey={shipmentKey} virtualize maxHeight="600px" />
		),
	)
})

describe('Grid · rerender after sort toggle (1,000 rows · truncating)', () => {
	// A resizable grid is fixed-layout and truncating, so every visible cell
	// mounts a `GridCellContent`. This exercises the path the performance audit
	// flagged: a sort change must not re-render every truncating cell (each reads
	// only the narrow resizing context, not the table-wide value the sort lives in).
	const rows = shipments(1_000)

	const sorted = (direction: SortState['direction']) => (
		<Grid
			columns={COLUMNS}
			rows={rows}
			getKey={shipmentKey}
			resizable
			sort={{ value: [{ column: 'origin', direction }] }}
		/>
	)

	rerenderBench(
		`${TOGGLES} toggles/iter`,
		() => sorted('asc'),
		(rerender, iteration) => {
			for (let toggle = 0; toggle < TOGGLES; toggle++) {
				rerender(sorted((iteration + toggle) % 2 === 0 ? 'desc' : 'asc'))
			}
		},
	)
})

describe('Grid · rerender after selection toggle (1,000 rows)', () => {
	const rows = shipments(1_000)

	const selected = (selection: Set<string | number>) => (
		<Grid columns={SELECTABLE} rows={rows} getKey={shipmentKey} selection={{ value: selection }} />
	)

	// The keys each iteration toggles, spread across the dataset.
	const keys = Array.from({ length: TOGGLES }, (_, index) =>
		shipmentKey(rows[index * 100] as Shipment),
	)

	let selection = new Set<string | number>()

	rerenderBench(
		`${TOGGLES} toggles/iter`,
		() => {
			selection = new Set()

			return selected(selection)
		},
		(rerender, iteration) => {
			// Select on even iterations, deselect on odd, so the selection stays
			// bounded at `TOGGLES` rather than growing until every row is selected
			// and the bench measures a different grid than it started on.
			const add = iteration % 2 === 0

			for (const key of keys) {
				// A fresh Set per toggle, the way a controlled consumer hands one down:
				// an in-place mutation would keep the same reference and let every
				// selection-reading memo bail, measuring nothing.
				selection = new Set(selection)

				if (add) selection.add(key)
				else selection.delete(key)

				rerender(selected(selection))
			}
		},
	)
})
