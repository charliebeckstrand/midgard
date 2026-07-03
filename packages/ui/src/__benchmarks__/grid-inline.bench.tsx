import { cleanup, render } from '@testing-library/react'
import { bench, describe } from 'vitest'
import { Grid, type GridColumn } from '../modules/grid'
import { makeInlineColumns, makeShipments, type Shipment } from './fixtures'

// The inline-in-chat render profile: small grids, mounted and unmounted as chat
// messages scroll, re-rendered on every streamed token, and rows arriving one at
// a time as a Markdown table grows. The existing grid.bench.tsx tunes the
// dashboard big-grid case (1k–10k rows, virtualization, heavy features); these
// benches cover the sizes and lifecycles chat actually hits, none of which the
// current suite measures. A chat grid never virtualizes (that needs `maxHeight`),
// so every row mounts.

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

const getKey = (row: Shipment) => row.id

describe('Grid · inline mount (small)', () => {
	// Fixed per-mount overhead (context providers, the TanStack engine, per-cell
	// truncation + tooltip fan-out) dominates at chat sizes and is invisible in
	// the 100→10k sweep. This is the headline inline number.
	for (const n of [5, 10, 20, 50]) {
		const rows = makeShipments(n)

		bench(`${n} rows × 4 cols`, () => {
			render(<Grid columns={COLUMNS} rows={rows} getKey={getKey} />)

			cleanup()
		})
	}
})

describe('Grid · inline mount — truncate on/off', () => {
	// `truncate` defaults true, so each data cell mounts a floating-ui Tooltip
	// stack (closed, but the hooks/effects allocate). Toggling it off isolates
	// that per-cell cost.
	const rows = makeShipments(20)

	bench('20 × 4 · truncate (default)', () => {
		render(<Grid columns={COLUMNS} rows={rows} getKey={getKey} />)

		cleanup()
	})

	bench('20 × 4 · truncate=false', () => {
		render(<Grid columns={COLUMNS} rows={rows} getKey={getKey} truncate={false} />)

		cleanup()
	})
})

describe('Grid · inline mount — resizable on/off', () => {
	// `resizable` defaults true, arming the auto-size pass that measures every
	// body cell synchronously before paint (O(rows × cols)). `resizable={false}`
	// stands the autosizer down; the gap is its pre-paint cost.
	for (const n of [50, 200]) {
		const rows = makeShipments(n)

		bench(`${n} × 6 · resizable (default)`, () => {
			render(<Grid columns={COLUMNS_6} rows={rows} getKey={getKey} />)

			cleanup()
		})

		bench(`${n} × 6 · resizable=false`, () => {
			render(<Grid columns={COLUMNS_6} rows={rows} getKey={getKey} resizable={false} />)

			cleanup()
		})
	}
})

describe('Grid · mount→unmount churn', () => {
	// A chat transcript scrolls rendered grids in and out of view: teardown cost
	// (portal removal, listener/observer detach) repeats as often as mount and is
	// never isolated by the cleanup()-per-bench pattern. A leaked listener or
	// observer shows here as iterations that drift slower.
	const rows = makeShipments(10)

	bench('10 × 4 · mount + unmount', () => {
		const { unmount } = render(<Grid columns={COLUMNS} rows={rows} getKey={getKey} />)

		unmount()
	})
})

describe('Grid · stable-prop rerender (unchanged data)', () => {
	// A grid embedded in a streaming assistant turn re-renders on every token
	// while its rows/columns are unchanged. Mounted once in setup; the body
	// measures a no-op re-render with identical references — near-zero for a
	// well-memoized grid, and the only place a memo regression surfaces.
	const rows = makeShipments(20)

	let rerender: ReturnType<typeof render>['rerender']

	bench(
		'20 × 4 · identical props',
		() => {
			rerender(<Grid columns={COLUMNS} rows={rows} getKey={getKey} />)
		},
		{
			setup() {
				const api = render(<Grid columns={COLUMNS} rows={rows} getKey={getKey} />)

				rerender = api.rerender
			},
			teardown() {
				cleanup()
			},
		},
	)
})

describe('Grid · streaming append', () => {
	// Rows arrive as the model streams a Markdown table: each token appends a row
	// and the message re-renders. Mounted at one row; the body grows the row slice
	// one at a time against a stable getKey, measuring the reconciliation of an
	// appended row (a new `rows` array each step, as a growing table produces).
	const full = makeShipments(50)

	let rerender: ReturnType<typeof render>['rerender']

	let n = 1

	bench(
		'grow 1→50 rows · 1 row/iter',
		() => {
			n = n >= full.length ? 1 : n + 1

			rerender(<Grid columns={COLUMNS} rows={full.slice(0, n)} getKey={getKey} />)
		},
		{
			setup() {
				n = 1

				const api = render(<Grid columns={COLUMNS} rows={full.slice(0, 1)} getKey={getKey} />)

				rerender = api.rerender
			},
			teardown() {
				cleanup()
			},
		},
	)
})

describe('Grid · many grids in one document', () => {
	// A long conversation holds many independent small grids (one per assistant
	// turn). Cross-grid overhead — duplicated providers, aggregate mount, any
	// global-listener contention — only appears when several co-exist.
	const rows = makeShipments(10)

	for (const count of [3, 10, 25]) {
		bench(`${count} grids · 10 × 4 each`, () => {
			render(
				<div>
					{Array.from({ length: count }, (_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: fixed-length static list
						<Grid key={i} columns={COLUMNS} rows={rows} getKey={getKey} />
					))}
				</div>,
			)

			cleanup()
		})
	}
})
