/**
 * The inline-in-chat render profile: small grids, mounted and unmounted as
 * chat messages scroll, re-rendered on every streamed token, and rows arriving
 * one at a time as a Markdown table grows. `grid.bench.tsx` tunes the
 * dashboard big-grid case (1k–10k rows, virtualization, heavy features); these
 * benches cover the sizes and lifecycles chat actually hits. A chat grid never
 * virtualizes (that needs `maxHeight`), so every row mounts.
 */

import { Grid, type GridColumn } from '../modules/grid'
import { compareBenches } from './compare'
import { makeInlineColumns, type Shipment, shipmentKey, shipments } from './fixtures'
import { mountBench, mountBenches, rerenderBench } from './harness'

const COLUMNS = makeInlineColumns()

// Six plain columns for the resizable sweep: the autosizer measures every body
// cell of every auto-sized column pre-paint, so the cost scales with rows.
const COLUMNS_6: GridColumn<Shipment>[] = [
	{ id: 'reference', title: 'Reference' },
	{ id: 'origin', title: 'Origin' },
	{ id: 'destination', title: 'Destination' },
	{ id: 'status', title: 'Status' },
	{ id: 'carrier', title: 'Carrier' },
	{ id: 'loads', title: 'Loads' },
]

/** Rows a streamed Markdown table grows to, one row per iteration. */
const STREAM_ROWS = 50

// Built at collection time: only the render belongs inside the timed region.
const SIZES = [5, 10, 20, 50].map((count) => shipments(count))

const rows10 = shipments(10)

const rows20 = shipments(20)

const streamed = shipments(STREAM_ROWS)

compareBenches('Grid · inline mount (small)', (bench) => {
	// Fixed per-mount overhead (context providers, the TanStack engine, per-cell
	// truncation + tooltip fan-out) dominates at chat sizes and is invisible in
	// the 100→10k sweep. This is the headline inline number.
	mountBenches(
		bench,
		SIZES,
		(rows) => `${rows.length} rows × 4 cols`,
		(rows) => <Grid columns={COLUMNS} rows={rows} getKey={shipmentKey} />,
	)
})

compareBenches('Grid · inline mount — truncate on/off', (bench) => {
	// `truncate` defaults true, so each data cell mounts a floating-ui Tooltip
	// stack (closed, but the hooks/effects allocate). Toggling it off isolates
	// that per-cell cost.
	mountBenches(
		bench,
		[true, false],
		(truncate) => `20 × 4 · ${truncate ? 'truncate (default)' : 'truncate=false'}`,
		(truncate) => <Grid columns={COLUMNS} rows={rows20} getKey={shipmentKey} truncate={truncate} />,
	)
})

compareBenches('Grid · inline mount — resizable on/off', (bench) => {
	// `resizable` defaults true, arming the auto-size pass that measures every
	// body cell synchronously before paint (O(rows × cols)). `resizable={false}`
	// stands the autosizer down; the gap is its pre-paint cost.
	mountBenches(
		bench,
		[50, 200].flatMap((count) =>
			[true, false].map((resizable) => ({ resizable, rows: shipments(count) })),
		),
		({ rows, resizable }) =>
			`${rows.length} × 6 · ${resizable ? 'resizable (default)' : 'resizable=false'}`,
		({ rows, resizable }) => (
			<Grid columns={COLUMNS_6} rows={rows} getKey={shipmentKey} resizable={resizable} />
		),
	)
})

compareBenches('Grid · mount→unmount churn', (bench) => {
	// A chat transcript scrolls rendered grids in and out of view: teardown cost
	// (portal removal, listener/observer detach) repeats as often as mount and is
	// never isolated by the cleanup()-per-bench pattern. A leaked listener or
	// observer shows here as iterations that drift slower.
	mountBench(bench, '10 × 4 · mount + unmount', () => (
		<Grid columns={COLUMNS} rows={rows10} getKey={shipmentKey} />
	))
})

compareBenches('Grid · stable-prop rerender (unchanged data)', (bench) => {
	// A grid embedded in a streaming assistant turn re-renders on every token
	// while its rows/columns are unchanged. Mounted once; the body measures a
	// no-op re-render with identical references: near-zero for a well-memoized
	// grid, and the only place a memo regression surfaces.
	const identical = <Grid columns={COLUMNS} rows={rows20} getKey={shipmentKey} />

	rerenderBench(
		bench,
		'20 × 4 · identical props',
		() => identical,
		(rerender) => rerender(identical),
	)
})

compareBenches('Grid · streaming append', (bench) => {
	// Rows arrive as the model streams a Markdown table: each token appends a row
	// and the message re-renders. Mounted at one row; the body grows the row slice
	// one at a time against a stable getKey, measuring the reconciliation of an
	// appended row (a new `rows` array each step, as a growing table produces).
	const upTo = (count: number) => (
		<Grid columns={COLUMNS} rows={streamed.slice(0, count)} getKey={shipmentKey} />
	)

	rerenderBench(
		bench,
		`grow 1→${STREAM_ROWS} rows · 1 row/iter`,
		() => upTo(1),
		(rerender, iteration) => rerender(upTo((iteration % STREAM_ROWS) + 1)),
	)
})

compareBenches('Grid · many grids in one document', (bench) => {
	// A long conversation holds many independent small grids (one per assistant
	// turn). Cross-grid overhead (duplicated providers, aggregate mount, any
	// global-listener contention) only appears when several co-exist.
	mountBenches(
		bench,
		[3, 10, 25],
		(count) => `${count} grids · 10 × 4 each`,
		(count) => (
			<div>
				{Array.from({ length: count }, (_, index) => `grid-${index}`).map((id) => (
					<Grid key={id} columns={COLUMNS} rows={rows10} getKey={shipmentKey} />
				))}
			</div>
		),
	)
})
